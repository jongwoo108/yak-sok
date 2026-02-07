"""
Health URLs - 건강 정보 API 라우팅
"""

from django.urls import re_path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter(trailing_slash=False)
router.register(r'profile', views.HealthProfileViewSet, basename='health-profile')
router.register(r'feed', views.VideoFeedViewSet, basename='health-feed')
router.register(r'bookmarks', views.VideoBookmarkViewSet, basename='health-bookmarks')

urlpatterns = [
    re_path(r'^/', include(router.urls)),
]
