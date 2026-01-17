"""
Alerts Models - 세이프티 라인 비상 알림 로직
"""

from django.db import models
from django.conf import settings


class Alert(models.Model):
    """
    비상 알림 기록
    Safety Line에서 발생한 모든 알림 추적
    """
    
    class AlertType(models.TextChoices):
        REMINDER = 'reminder', '복약 리마인더'
        WARNING = 'warning', '미복약 경고'
        EMERGENCY = 'emergency', '비상 알림'
    
    class Status(models.TextChoices):
        PENDING = 'pending', '대기 중'
        SENT = 'sent', '발송됨'
        CANCELLED = 'cancelled', '취소됨'
        FAILED = 'failed', '실패'
    
    # 알림 대상 (시니어)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='alerts',
        verbose_name='대상 사용자'
    )
    # 알림을 받는 사람 (보호자 또는 시니어 본인)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_alerts',
        verbose_name='알림 수신자',
        null=True,
        blank=True
    )
    medication_log = models.ForeignKey(
        'medications.MedicationLog',
        on_delete=models.CASCADE,
        related_name='alerts',
        verbose_name='복약 기록',
        null=True,
        blank=True
    )
    alert_type = models.CharField(
        max_length=15,
        choices=AlertType.choices,
        default=AlertType.REMINDER,
        verbose_name='알림 유형'
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='상태'
    )
    title = models.CharField(
        max_length=100,
        verbose_name='알림 제목'
    )
    message = models.TextField(
        verbose_name='알림 내용'
    )
    # Celery 태스크 추적
    celery_task_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Celery 태스크 ID'
    )
    scheduled_at = models.DateTimeField(
        verbose_name='예약 시간'
    )
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='발송 시간'
    )
    retry_count = models.PositiveIntegerField(
        default=0,
        verbose_name='재시도 횟수'
    )
    error_message = models.TextField(
        blank=True,
        verbose_name='에러 메시지'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '비상 알림'
        verbose_name_plural = '비상 알림 목록'
        ordering = ['-scheduled_at']
    
    def __str__(self):
        return f"[{self.get_alert_type_display()}] {self.title} ({self.get_status_display()})"


class EmergencyContact(models.Model):
    """
    비상 연락처
    Safety Line 최종 단계에서 호출되는 연락처
    """
    
    class ContactType(models.TextChoices):
        GUARDIAN = 'guardian', '보호자'
        HOSPITAL = 'hospital', '병원/의료기관'
        EMERGENCY = 'emergency', '119 응급서비스'
        OTHER = 'other', '기타'
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='alert_emergency_contacts',
        verbose_name='사용자'
    )
    name = models.CharField(
        max_length=50,
        verbose_name='연락처 이름'
    )
    phone_number = models.CharField(
        max_length=15,
        verbose_name='전화번호'
    )
    contact_type = models.CharField(
        max_length=15,
        choices=ContactType.choices,
        default=ContactType.GUARDIAN,
        verbose_name='연락처 유형'
    )
    priority = models.PositiveIntegerField(
        default=1,
        verbose_name='우선순위'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = '비상 연락처'
        verbose_name_plural = '비상 연락처 목록'
        ordering = ['priority']
    
    def __str__(self):
        return f"{self.name} ({self.phone_number}) - {self.get_contact_type_display()}"
