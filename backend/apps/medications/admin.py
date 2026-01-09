"""
Medications Admin
"""

from django.contrib import admin
from .models import Medication, MedicationSchedule, MedicationLog


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'dosage', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'user__username']


@admin.register(MedicationSchedule)
class MedicationScheduleAdmin(admin.ModelAdmin):
    list_display = ['medication', 'time_of_day', 'scheduled_time', 'is_active']
    list_filter = ['time_of_day', 'is_active']
    search_fields = ['medication__name']


@admin.register(MedicationLog)
class MedicationLogAdmin(admin.ModelAdmin):
    list_display = ['schedule', 'scheduled_datetime', 'status', 'taken_datetime']
    list_filter = ['status', 'scheduled_datetime']
    search_fields = ['schedule__medication__name']
    date_hierarchy = 'scheduled_datetime'
