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
        fields = ['id', 'name', 'color', 'medications_count', 'created_at', 'updated_at']
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
    
    class Meta:
        model = Medication
        fields = [
            'id', 'name', 'description', 'dosage', 'group', 'group_id',
            'prescription_image', 'is_active', 'schedules', 'schedules_input',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        from datetime import datetime, date
        from django.utils import timezone
        
        schedules_data = validated_data.pop('schedules_input', [])
        group_id = validated_data.pop('group_id', None)
        validated_data['user'] = self.context['request'].user
        
        # 그룹 설정
        if group_id:
            try:
                group = MedicationGroup.objects.get(id=group_id, user=validated_data['user'])
                validated_data['group'] = group
            except MedicationGroup.DoesNotExist:
                pass
        
        medication = super().create(validated_data)
        
        # 스케줄 생성 + 오늘의 로그 자동 생성
        today = date.today()
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
            MedicationLog.objects.create(
                schedule=schedule,
                scheduled_datetime=scheduled_datetime,
                status=MedicationLog.Status.PENDING
            )
        
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
    
    image = serializers.ImageField(required=True)
    
    def validate_image(self, value):
        # 이미지 크기 제한 (10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('이미지 크기는 10MB를 초과할 수 없습니다.')
        return value


class STTCommandSerializer(serializers.Serializer):
    """음성 명령 STT 시리얼라이저"""
    
    audio = serializers.FileField(required=True)
    
    def validate_audio(self, value):
        # 오디오 파일 크기 제한 (25MB - Whisper API 제한)
        if value.size > 25 * 1024 * 1024:
            raise serializers.ValidationError('오디오 파일 크기는 25MB를 초과할 수 없습니다.')
        return value
