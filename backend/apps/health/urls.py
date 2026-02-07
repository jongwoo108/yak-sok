"""
Health URLs - 건강 정보 API 라우팅
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('profile', views.HealthProfileViewSet, basename='health-profile')
router.register('feed', views.VideoFeedViewSet, basename='health-feed')
router.register('bookmarks', views.VideoBookmarkViewSet, basename='health-bookmarks')

urlpatterns = [
    path('', include(router.urls)),
]
