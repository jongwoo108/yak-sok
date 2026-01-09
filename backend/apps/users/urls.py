"""
Users URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, GuardianRelationViewSet

router = DefaultRouter()
router.register('', UserViewSet, basename='user')
router.register('guardians', GuardianRelationViewSet, basename='guardian-relation')

urlpatterns = [
    path('', include(router.urls)),
]
