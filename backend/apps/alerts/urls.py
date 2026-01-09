"""
Alerts URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, EmergencyContactViewSet

router = DefaultRouter()
router.register('', AlertViewSet, basename='alert')
router.register('emergency-contacts', EmergencyContactViewSet, basename='emergency-contact')

urlpatterns = [
    path('', include(router.urls)),
]
