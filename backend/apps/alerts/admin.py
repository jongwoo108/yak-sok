"""
Alerts Admin
"""

from django.contrib import admin
from .models import Alert, EmergencyContact


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'alert_type', 'status', 'scheduled_at', 'sent_at']
    list_filter = ['alert_type', 'status', 'scheduled_at']
    search_fields = ['title', 'user__username', 'message']
    date_hierarchy = 'scheduled_at'
    readonly_fields = ['celery_task_id', 'sent_at', 'retry_count']


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'phone_number', 'contact_type', 'priority', 'is_active']
    list_filter = ['contact_type', 'is_active']
    search_fields = ['name', 'phone_number', 'user__username']
