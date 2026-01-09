"""
Medications Views
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Medication, MedicationSchedule, MedicationLog
from .serializers import (
    MedicationSerializer,
    MedicationScheduleSerializer,
    MedicationLogSerializer,
    OCRScanSerializer,
    STTCommandSerializer,
)
from .services import OCRService, STTService


class MedicationViewSet(viewsets.ModelViewSet):
    """복용 약품 ViewSet"""
    
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Medication.objects.filter(user=self.request.user)
    
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
        )
    
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
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """오늘의 복약 기록 조회"""
        today = timezone.now().date()
        logs = self.get_queryset().filter(
            scheduled_datetime__date=today
        )
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)
