"""
Medications Serializers
"""

from rest_framework import serializers
from .models import Medication, MedicationSchedule, MedicationLog


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


class MedicationSerializer(serializers.ModelSerializer):
    """복용 약품 시리얼라이저"""
    
    schedules = MedicationScheduleSerializer(many=True, read_only=True)
    
    class Meta:
        model = Medication
        fields = [
            'id', 'name', 'description', 'dosage',
            'prescription_image', 'is_active', 'schedules',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class MedicationLogSerializer(serializers.ModelSerializer):
    """복약 기록 시리얼라이저"""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    medication_name = serializers.CharField(source='schedule.medication.name', read_only=True)
    
    class Meta:
        model = MedicationLog
        fields = [
            'id', 'schedule', 'medication_name',
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
