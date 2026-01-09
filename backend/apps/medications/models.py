"""
Medications Models - 복약 스케줄 및 OCR 파싱
"""

from django.db import models
from django.conf import settings


class Medication(models.Model):
    """
    복용 약품 정보
    OCR 스캔 또는 수동 입력으로 등록
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medications',
        verbose_name='사용자'
    )
    name = models.CharField(
        max_length=100,
        verbose_name='약품명'
    )
    description = models.TextField(
        blank=True,
        verbose_name='복용 설명'
    )
    dosage = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='복용량'
    )
    # OCR 스캔 이미지 저장
    prescription_image = models.ImageField(
        upload_to='prescriptions/',
        blank=True,
        null=True,
        verbose_name='처방전 이미지'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '복용 약품'
        verbose_name_plural = '복용 약품 목록'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"


class MedicationSchedule(models.Model):
    """
    복약 스케줄
    특정 시간에 약 복용 알림
    """
    
    class TimeOfDay(models.TextChoices):
        MORNING = 'morning', '아침'
        NOON = 'noon', '점심'
        EVENING = 'evening', '저녁'
        NIGHT = 'night', '취침 전'
        CUSTOM = 'custom', '사용자 지정'
    
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name='schedules',
        verbose_name='약품'
    )
    time_of_day = models.CharField(
        max_length=10,
        choices=TimeOfDay.choices,
        default=TimeOfDay.MORNING,
        verbose_name='복용 시간대'
    )
    scheduled_time = models.TimeField(
        verbose_name='예정 시간'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태'
    )
    
    class Meta:
        verbose_name = '복약 스케줄'
        verbose_name_plural = '복약 스케줄 목록'
        ordering = ['scheduled_time']
    
    def __str__(self):
        return f"{self.medication.name} - {self.get_time_of_day_display()} ({self.scheduled_time})"


class MedicationLog(models.Model):
    """
    복약 기록
    실제 복용 여부 추적 (Safety Line의 핵심 데이터)
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', '대기 중'
        TAKEN = 'taken', '복용 완료'
        MISSED = 'missed', '미복용'
        SKIPPED = 'skipped', '건너뜀'
    
    schedule = models.ForeignKey(
        MedicationSchedule,
        on_delete=models.CASCADE,
        related_name='logs',
        verbose_name='스케줄'
    )
    scheduled_datetime = models.DateTimeField(
        verbose_name='예정 일시'
    )
    taken_datetime = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='복용 일시'
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='상태'
    )
    # Celery 태스크 ID (취소를 위해 저장)
    celery_task_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='알림 태스크 ID'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='메모'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '복약 기록'
        verbose_name_plural = '복약 기록 목록'
        ordering = ['-scheduled_datetime']
    
    def __str__(self):
        return f"{self.schedule.medication.name} - {self.scheduled_datetime.date()} ({self.get_status_display()})"
