"""
Users Admin
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, GuardianRelation


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'is_premium', 'premium_until', 'is_active']
    list_filter = ['role', 'is_premium', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'phone_number']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('추가 정보', {
            'fields': ('role', 'phone_number', 'emergency_contact', 'fcm_token')
        }),
        ('프리미엄 구독', {
            'fields': ('is_premium', 'premium_until'),
            'description': 'premium_until을 비워두면 무기한 프리미엄입니다.',
        }),
    )


@admin.register(GuardianRelation)
class GuardianRelationAdmin(admin.ModelAdmin):
    list_display = ['senior', 'guardian', 'is_primary', 'created_at']
    list_filter = ['is_primary']
    search_fields = ['senior__username', 'guardian__username']
