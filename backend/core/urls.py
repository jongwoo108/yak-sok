"""
URL configuration for Yak-Sok project.
"""

from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import render
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


# 법적 문서 페이지 (인증 불필요)
def terms_view(request):
    return render(request, 'terms.html')


def privacy_view(request):
    return render(request, 'privacy.html')


urlpatterns = [
    path('admin/', admin.site.urls),

    # 법적 문서 (DRF 인증 우회)
    path('terms/', terms_view, name='terms'),
    path('privacy/', privacy_view, name='privacy'),

    # JWT Authentication (optional trailing slash)
    re_path(r'^api/token/?$', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    re_path(r'^api/token/refresh/?$', TokenRefreshView.as_view(), name='token_refresh'),

    # App URLs (optional trailing slash for prefix)
    re_path(r'^api/users/?', include('apps.users.urls')),
    re_path(r'^api/medications/?', include('apps.medications.urls')),
    re_path(r'^api/alerts/?', include('apps.alerts.urls')),
    re_path(r'^api/health/?', include('apps.health.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
