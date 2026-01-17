"""
Medications Serializers
"""

from rest_framework import serializers
from .models import Medication, MedicationSchedule, MedicationLog, MedicationGroup


class MedicationGroupSerializer(serializers.ModelSerializer):
    """약품 그룹 시리얼라이저"""
    
    medications_count = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicationGroup
        fields = ['id', 'name', 'color', 'is_severe', 'medications_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_medications_count(self, obj):
        return obj.medications.count()
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class MedicationScheduleSerializer(serializers.ModelSerializer):
    """복약 스케줄 시리얼라이저"""
    
    time_of_day_display = serializers.CharField(source='get_time_of_day_display', read_only=True)
    
    class Meta:
        model = MedicationSchedule
        fields = [
            'id', 'medication', 'time_of_day', 'time_of_day_display',
            'scheduled_time', 'is_active'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'medication': {'required': False}  # nested create에서는 자동 설정
        }


class MedicationScheduleWriteSerializer(serializers.Serializer):
    """약 생성 시 스케줄 입력용"""
    time_of_day = serializers.ChoiceField(choices=MedicationSchedule.TimeOfDay.choices)
    scheduled_time = serializers.TimeField()


class MedicationSerializer(serializers.ModelSerializer):
    """복용 약품 시리얼라이저"""
    
    schedules = MedicationScheduleSerializer(many=True, read_only=True)
    schedules_input = MedicationScheduleWriteSerializer(many=True, write_only=True, required=False)
    group_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    group = MedicationGroupSerializer(read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True, allow_null=True)
    end_date = serializers.DateField(read_only=True)  # 처방 종료일 (계산됨)
    
    class Meta:
        model = Medication
        fields = [
            'id', 'name', 'description', 'dosage', 'group', 'group_id', 'group_name',
            'days_supply', 'start_date', 'end_date',
            'prescription_image', 'is_active', 'schedules', 'schedules_input',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'end_date']
    
    def create(self, validated_data):
        from datetime import datetime
        from django.utils import timezone
        
        schedules_data = validated_data.pop('schedules_input', [])
        group_id = validated_data.pop('group_id', None)
        validated_data['user'] = self.context['request'].user
        
        # 시작일이 없으면 오늘로 설정
        if not validated_data.get('start_date'):
            validated_data['start_date'] = timezone.localdate()
        
        # 그룹 설정
        if group_id:
            try:
                group = MedicationGroup.objects.get(id=group_id, user=validated_data['user'])
                validated_data['group'] = group
            except MedicationGroup.DoesNotExist:
                pass
        
        medication = super().create(validated_data)
        
        # 스케줄 생성 + 오늘의 로그 자동 생성
        today = timezone.localdate()
        for schedule_data in schedules_data:
            schedule = MedicationSchedule.objects.create(
                medication=medication,
                time_of_day=schedule_data['time_of_day'],
                scheduled_time=schedule_data['scheduled_time']
            )
            
            # 오늘 날짜의 MedicationLog 자동 생성
            scheduled_datetime = timezone.make_aware(
                datetime.combine(today, schedule_data['scheduled_time'])
            )
            log = MedicationLog.objects.create(
                schedule=schedule,
                scheduled_datetime=scheduled_datetime,
                status=MedicationLog.Status.PENDING
            )
            
            # 비상 알림 스케줄링 (.delay() 사용)
            try:
                from apps.alerts.tasks import schedule_medication_alert
                schedule_medication_alert.delay(log.id)
            except Exception as e:
                print(f"알림 스케줄링 실패: {e}")
        
        return medication


class MedicationLogSerializer(serializers.ModelSerializer):
    """복약 기록 시리얼라이저"""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    medication_name = serializers.CharField(source='schedule.medication.name', read_only=True)
    medication_dosage = serializers.CharField(source='schedule.medication.dosage', read_only=True)
    group_id = serializers.IntegerField(source='schedule.medication.group_id', read_only=True, allow_null=True)
    group_name = serializers.CharField(source='schedule.medication.group.name', read_only=True, allow_null=True)
    time_of_day = serializers.CharField(source='schedule.time_of_day', read_only=True)
    time_of_day_display = serializers.CharField(source='schedule.get_time_of_day_display', read_only=True)
    
    class Meta:
        model = MedicationLog
        fields = [
            'id', 'schedule', 'medication_name', 'medication_dosage',
            'group_id', 'group_name', 'time_of_day', 'time_of_day_display',
            'scheduled_datetime', 'taken_datetime',
            'status', 'status_display', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OCRScanSerializer(serializers.Serializer):
    """처방전 OCR 스캔 시리얼라이저"""
    
    image_base64 = serializers.CharField(required=True)
    
    def validate_image_base64(self, value):
        if not value:
            raise serializers.ValidationError('이미지 데이터가 비어있습니다.')
        return value


