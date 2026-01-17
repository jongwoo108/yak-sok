"""
Alerts Serializers
"""

from rest_framework import serializers
from .models import Alert, EmergencyContact


class SendAlertSerializer(serializers.Serializer):
    """사용자 간 알림 전송 시리얼라이저"""
    
    MESSAGE_TYPES = [
        ('check_in', '안부 확인'),
        ('reminder', '약 드셨나요?'),
        ('im_ok', '괜찮아요'),
        ('need_help', '도움이 필요해요'),
        ('custom', '직접 입력'),
    ]
    
    recipient_id = serializers.IntegerField(help_text='알림 받을 사용자 ID')
    message_type = serializers.ChoiceField(choices=MESSAGE_TYPES, help_text='메시지 유형')
    custom_message = serializers.CharField(required=False, allow_blank=True, max_length=200, help_text='직접 입력 메시지')
    
    def validate(self, data):
        if data['message_type'] == 'custom' and not data.get('custom_message'):
            raise serializers.ValidationError({'custom_message': '직접 입력 메시지를 작성해주세요.'})
        return data


class AlertSerializer(serializers.ModelSerializer):
    """비상 알림 시리얼라이저"""
    
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    medication_name = serializers.CharField(
        source='medication_log.schedule.medication.name',
        read_only=True
    )
    
    class Meta:
        model = Alert
        fields = [
            'id', 'user', 'recipient', 'medication_log', 'medication_name',
            'alert_type', 'alert_type_display', 'status', 'status_display',
            'title', 'message', 'scheduled_at', 'sent_at',
            'retry_count', 'created_at'
        ]
        read_only_fields = ['id', 'sent_at', 'retry_count', 'created_at']


class EmergencyContactSerializer(serializers.ModelSerializer):
    """비상 연락처 시리얼라이저"""
    
    contact_type_display = serializers.CharField(source='get_contact_type_display', read_only=True)
    
    class Meta:
        model = EmergencyContact
        fields = [
            'id', 'name', 'phone_number', 'contact_type',
            'contact_type_display', 'priority', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
