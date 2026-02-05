"""
Alerts Views
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Alert, EmergencyContact
from .serializers import AlertSerializer, EmergencyContactSerializer, SendAlertSerializer


class AlertViewSet(viewsets.ReadOnlyModelViewSet):
    """비상 알림 ViewSet (읽기 전용)"""
    
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # 시니어: 본인 알림 / 보호자: 담당 시니어 알림
        if user.role == 'senior':
            return Alert.objects.filter(user=user)
        else:
            from apps.users.models import GuardianRelation
            senior_ids = GuardianRelation.objects.filter(
                guardian=user
            ).values_list('senior_id', flat=True)
            return Alert.objects.filter(user_id__in=senior_ids)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """대기 중인 알림 조회"""
        alerts = self.get_queryset().filter(status=Alert.Status.PENDING)
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def send(self, request):
        """
        연결된 사용자에게 알림 전송
        - 보호자 → 시니어: 안부 확인, 약 드셨나요?
        - 시니어 → 보호자: 괜찮아요, 도움 필요해요
        """
        serializer = SendAlertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from django.contrib.auth import get_user_model
        from apps.users.models import GuardianRelation
        from .tasks import send_push_notification
        
        User = get_user_model()
        sender = request.user
        recipient_id = serializer.validated_data['recipient_id']
        message_type = serializer.validated_data['message_type']
        custom_message = serializer.validated_data.get('custom_message', '')
        
        # 수신자 확인
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response(
                {'error': '수신자를 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 연결 관계 확인
        is_connected = False
        if sender.role == 'guardian':
            # 보호자가 보내는 경우 - 담당 시니어/복약자인지 확인
            is_connected = GuardianRelation.objects.filter(
                guardian=sender, senior=recipient
            ).exists()
        elif sender.role in ['senior', 'patient']:
            # 시니어/복약자가 보내는 경우 - 담당 보호자인지 확인
            is_connected = GuardianRelation.objects.filter(
                senior=sender, guardian=recipient
            ).exists()
        
        if not is_connected:
            return Response(
                {'error': '연결되지 않은 사용자에게는 알림을 보낼 수 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 메시지 내용 생성
        message_templates = {
            'check_in': ('안부 확인', f'{sender.first_name or sender.username}님이 안부를 확인합니다.'),
            'reminder': ('약 드셨나요?', f'{sender.first_name or sender.username}님이 복약 여부를 확인합니다.'),
            'im_ok': ('괜찮아요', f'{sender.first_name or sender.username}님이 괜찮다고 전합니다.'),
            'need_help': ('도움 필요', f'{sender.first_name or sender.username}님이 도움을 요청합니다.'),
            'custom': ('메시지', custom_message),
        }
        
        title, message = message_templates.get(message_type, ('알림', custom_message))
        
        # 알림 레코드 생성
        alert = Alert.objects.create(
            user=recipient,
            recipient=recipient,
            alert_type=Alert.AlertType.REMINDER,
            title=f'[{sender.first_name or sender.username}] {title}',
            message=message,
            scheduled_at=timezone.now(),
            status=Alert.Status.SENT,
            sent_at=timezone.now(),
        )
        
        # 푸시 알림 발송
        send_push_notification.delay(
            user_id=recipient.id,
            title=f'[{sender.first_name or sender.username}] {title}',
            message=message,
            severity='reminder'
        )
        
        return Response({
            'success': True,
            'message': f'{recipient.first_name or recipient.username}님에게 알림을 보냈습니다.',
            'alert_id': alert.id
        })


class EmergencyContactViewSet(viewsets.ModelViewSet):
    """비상 연락처 ViewSet"""
    
    serializer_class = EmergencyContactSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return EmergencyContact.objects.filter(user=self.request.user)
