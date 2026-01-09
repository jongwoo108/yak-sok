"""
Users URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, GuardianRelationViewSet

router = DefaultRouter(trailing_slash=False)
router.register('guardians', GuardianRelationViewSet, basename='guardian-relation')
router.register('', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
