"""
Users URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, 
    GuardianRelationViewSet, 
    EmergencyContactViewSet,
    RegisterView, 
    LoginView, 
    GoogleLoginView,
    InviteCodeView,
    AcceptInviteView,
)

router = DefaultRouter()
router.register('guardians', GuardianRelationViewSet, basename='guardian-relation')
router.register('emergency-contacts', EmergencyContactViewSet, basename='emergency-contact')
router.register('', UserViewSet, basename='user')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('login/google/', GoogleLoginView.as_view(), name='google-login'),
    path('invite/', InviteCodeView.as_view(), name='invite-code'),
    path('invite/accept/', AcceptInviteView.as_view(), name='accept-invite'),
    path('', include(router.urls)),
]

