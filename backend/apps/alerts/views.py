"""
Alerts Views
"""

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Alert, EmergencyContact
from .serializers import AlertSerializer, EmergencyContactSerializer


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


class EmergencyContactViewSet(viewsets.ModelViewSet):
    """비상 연락처 ViewSet"""
    
    serializer_class = EmergencyContactSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return EmergencyContact.objects.filter(user=self.request.user)
