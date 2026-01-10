"""
Users URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, 
    GuardianRelationViewSet, 
    RegisterView, 
    LoginView, 
    GoogleLoginView
)

router = DefaultRouter(trailing_slash=False)
router.register('guardians', GuardianRelationViewSet, basename='guardian-relation')
router.register('', UserViewSet, basename='user')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('login/google/', GoogleLoginView.as_view(), name='google-login'),
    path('', include(router.urls)),
]
