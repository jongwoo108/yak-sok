"""
Medications URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicationViewSet, MedicationScheduleViewSet, MedicationLogViewSet

# trailing_slash=False로 설정하여 슬래시 없는 URL도 허용
router = DefaultRouter(trailing_slash=False)
# 중요: 더 구체적인 경로를 먼저 등록하여 URL 충돌 방지
router.register('schedules', MedicationScheduleViewSet, basename='schedule')
router.register('logs', MedicationLogViewSet, basename='log')
# 루트 경로는 마지막에 등록
router.register('', MedicationViewSet, basename='medication')

urlpatterns = [
    path('', include(router.urls)),
]
