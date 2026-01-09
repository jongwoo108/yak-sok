"""
Alerts URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, EmergencyContactViewSet

router = DefaultRouter(trailing_slash=False)
router.register('emergency-contacts', EmergencyContactViewSet, basename='emergency-contact')
router.register('', AlertViewSet, basename='alert')

urlpatterns = [
    path('', include(router.urls)),
]
