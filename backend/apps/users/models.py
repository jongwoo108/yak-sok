"""
Users Models - 사용자 계정 및 보호자 연결 관계
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    커스텀 사용자 모델
    시니어와 보호자 역할 구분
    """
    
    class Role(models.TextChoices):
        SENIOR = 'senior', '시니어'
        GUARDIAN = 'guardian', '보호자'
    
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.SENIOR,
        verbose_name='역할'
    )
    phone_number = models.CharField(
        max_length=15,
        blank=True,
        verbose_name='전화번호'
    )
    emergency_contact = models.CharField(
        max_length=15,
        blank=True,
        verbose_name='비상 연락처'
    )
    emergency_relation = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='비상 연락처 관계'
    )
    emergency_name = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='비상 연락처 이름'
    )
    
    # FCM Token for push notifications
    fcm_token = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='FCM 토큰'
    )
    
    class Meta:
        verbose_name = '사용자'
        verbose_name_plural = '사용자 목록'
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class GuardianRelation(models.Model):
    """
    시니어-보호자 연결 관계
    한 시니어에 여러 보호자 연결 가능
    """
    
    senior = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='guardians',
        limit_choices_to={'role': User.Role.SENIOR},
        verbose_name='시니어'
    )
    guardian = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='seniors',
        limit_choices_to={'role': User.Role.GUARDIAN},
        verbose_name='보호자'
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name='주 보호자 여부'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = '보호자 관계'
        verbose_name_plural = '보호자 관계 목록'
        unique_together = ['senior', 'guardian']
    
    def __str__(self):
        return f"{self.senior.username} ← {self.guardian.username}"


class EmergencyContact(models.Model):
    """
    비상 연락처 모델
    한 사용자에 여러 연락처 등록 가능
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='emergency_contacts',
        verbose_name='사용자'
    )
    name = models.CharField(
        max_length=50,
        verbose_name='이름'
    )
    relation = models.CharField(
        max_length=50,
        verbose_name='관계'
    )
    phone_number = models.CharField(
        max_length=15,
        blank=True,
        verbose_name='전화번호'
    )
    email = models.EmailField(
        blank=True,
        verbose_name='이메일'
    )
    notify_by_email = models.BooleanField(
        default=True,
        verbose_name='이메일 알림'
    )
    is_primary = models.BooleanField(
        default=False,
        verbose_name='주 연락처 여부'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '비상 연락처'
        verbose_name_plural = '비상 연락처 목록'
        ordering = ['-is_primary', '-created_at']
    
    def __str__(self):
        return f"{self.user.username}의 비상연락처: {self.name} ({self.relation})"
