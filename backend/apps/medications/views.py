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
)
from .services import OCRService


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
    
    @action(detail=False, methods=['post'], url_path='scan')
    def scan_prescription(self, request):
        """처방전 OCR 스캔으로 약품 자동 등록"""
        serializer = OCRScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            import base64
            import io
            
            image_data = base64.b64decode(serializer.validated_data['image_base64'])
            image_file = io.BytesIO(image_data)
            
            ocr_service = OCRService()
            result = ocr_service.parse_prescription(image_file)
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
    
    @action(detail=False, methods=['post'], url_path='batch-take')
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
        today = timezone.localdate()
        logs = self.get_queryset().filter(
            scheduled_datetime__date=today
        ).order_by('schedule__scheduled_time')
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """월별 복약 현황 및 병원 방문일 조회"""
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        
        logs = self.get_queryset().filter(
            scheduled_datetime__year=year,
            scheduled_datetime__month=month
        )
        
        # 날짜별 집계
        daily_summary = {}
        for log in logs:
            date_str = log.scheduled_datetime.date().isoformat()
            if date_str not in daily_summary:
                daily_summary[date_str] = {'total': 0, 'taken': 0, 'missed': 0}
            daily_summary[date_str]['total'] += 1
            if log.status == MedicationLog.Status.TAKEN:
                daily_summary[date_str]['taken'] += 1
            elif log.status == MedicationLog.Status.MISSED:
                daily_summary[date_str]['missed'] += 1
        
        # 병원 방문일 (약 떨어지는 날) 계산
        hospital_visits = []
        medications = Medication.objects.filter(
            user=request.user,
            is_active=True,
            days_supply__isnull=False,
            start_date__isnull=False
        )
        
        for med in medications:
            end_date = med.end_date
            if end_date and end_date.year == year and end_date.month == month:
                hospital_visits.append({
                    'date': end_date.isoformat(),
                    'medication_id': med.id,
                    'medication_name': med.name,
                    'days_supply': med.days_supply,
                })
        
        return Response({
            'daily_summary': daily_summary,
            'hospital_visits': hospital_visits,
        })
    
    @action(detail=False, methods=['get'], url_path='by-date')
    def by_date(self, request):
        """특정 날짜의 복약 기록 조회"""
        date_str = request.query_params.get('date')
        if not date_str:
            return Response(
                {'error': 'date parameter is required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from datetime import datetime
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logs = self.get_queryset().filter(
            scheduled_datetime__date=target_date
        ).order_by('schedule__scheduled_time')
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)

