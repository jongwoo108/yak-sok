"""
Medications URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicationViewSet, MedicationScheduleViewSet, MedicationLogViewSet

router = DefaultRouter()
router.register('', MedicationViewSet, basename='medication')
router.register('schedules', MedicationScheduleViewSet, basename='schedule')
router.register('logs', MedicationLogViewSet, basename='log')

urlpatterns = [
    path('', include(router.urls)),
]
