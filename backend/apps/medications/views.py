"""
Medications Views
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Medication, MedicationSchedule, MedicationLog, MedicationGroup
from .serializers import (
    MedicationSerializer,
    MedicationScheduleSerializer,
    MedicationLogSerializer,
    MedicationGroupSerializer,
    OCRScanSerializer,
    STTCommandSerializer,
)
from .services import OCRService, STTService


class MedicationGroupViewSet(viewsets.ModelViewSet):
    """약품 그룹 ViewSet"""
    
    serializer_class = MedicationGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MedicationGroup.objects.filter(user=self.request.user)


class MedicationViewSet(viewsets.ModelViewSet):
    """복용 약품 ViewSet"""
    
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Medication.objects.filter(user=self.request.user).select_related('group')
    
    @action(detail=False, methods=['post'])
    def scan_prescription(self, request):
        """처방전 OCR 스캔으로 약품 자동 등록"""
        serializer = OCRScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            ocr_service = OCRService()
            result = ocr_service.parse_prescription(
                serializer.validated_data['image']
            )
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def voice_command(self, request):
        """음성 명령으로 복약 일정 관리"""
        serializer = STTCommandSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            stt_service = STTService()
            result = stt_service.process_command(
                serializer.validated_data['audio'],
                user=request.user
            )
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MedicationScheduleViewSet(viewsets.ModelViewSet):
    """복약 스케줄 ViewSet"""
    
    serializer_class = MedicationScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MedicationSchedule.objects.filter(
            medication__user=self.request.user
        )


class MedicationLogViewSet(viewsets.ModelViewSet):
    """복약 기록 ViewSet"""
    
    serializer_class = MedicationLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MedicationLog.objects.filter(
            schedule__medication__user=self.request.user
        ).select_related('schedule__medication__group', 'schedule')
    
    @action(detail=True, methods=['post'])
    def take(self, request, pk=None):
        """
        복약 완료 처리
        Safety Line: 예약된 비상 알림 취소
        """
        log = self.get_object()
        
        if log.status == MedicationLog.Status.TAKEN:
            return Response(
                {'error': '이미 복용 완료된 기록입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 복약 완료 처리
        log.status = MedicationLog.Status.TAKEN
        log.taken_datetime = timezone.now()
        log.save()
        
        # Celery 태스크 취소 (Safety Line)
        if log.celery_task_id:
            from apps.alerts.tasks import revoke_alert_task
            revoke_alert_task(log.celery_task_id)
        
        serializer = self.get_serializer(log)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def batch_take(self, request):
        """
        그룹 일괄 복약 완료 처리
        같은 그룹, 같은 시간대의 모든 약을 한번에 복용 완료 처리
        """
        group_id = request.data.get('group_id')
        time_of_day = request.data.get('time_of_day')
        log_ids = request.data.get('log_ids', [])
        
        if log_ids:
            # log_ids로 직접 지정된 경우
            logs = self.get_queryset().filter(
                id__in=log_ids,
                status=MedicationLog.Status.PENDING
            )
        elif group_id and time_of_day:
            # 그룹 + 시간대로 필터
            today = timezone.now().date()
            logs = self.get_queryset().filter(
                schedule__medication__group_id=group_id,
                schedule__time_of_day=time_of_day,
                scheduled_datetime__date=today,
                status=MedicationLog.Status.PENDING
            )
        else:
            return Response(
                {'error': 'log_ids 또는 group_id와 time_of_day가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        now = timezone.now()
        taken_logs = []
        
        for log in logs:
            log.status = MedicationLog.Status.TAKEN
            log.taken_datetime = now
            log.save()
            
            # Celery 태스크 취소 (Safety Line)
            if log.celery_task_id:
                try:
                    from apps.alerts.tasks import revoke_alert_task
                    revoke_alert_task(log.celery_task_id)
                except:
                    pass
            
            taken_logs.append(log)
        
        serializer = self.get_serializer(taken_logs, many=True)
        return Response({
            'taken_count': len(taken_logs),
            'logs': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """오늘의 복약 기록 조회"""
        today = timezone.now().date()
        logs = self.get_queryset().filter(
            scheduled_datetime__date=today
        ).order_by('schedule__scheduled_time')
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)

