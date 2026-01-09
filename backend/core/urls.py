"""
URL configuration for Yak-Sok project.
"""

from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Authentication (optional trailing slash)
    re_path(r'^api/token/?$', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    re_path(r'^api/token/refresh/?$', TokenRefreshView.as_view(), name='token_refresh'),
    
    # App URLs (optional trailing slash for prefix)
    re_path(r'^api/users/?', include('apps.users.urls')),
    re_path(r'^api/medications/?', include('apps.medications.urls')),
    re_path(r'^api/alerts/?', include('apps.alerts.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

