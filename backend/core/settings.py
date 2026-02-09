"""
Django settings for Yak-Sok project.
시니어 맞춤형 복약 관리 및 응급 상황 감지 시스템
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

# Sentry Error Tracking (Production) - optional for local dev
SENTRY_DSN = os.environ.get('SENTRY_DSN', '')
if SENTRY_DSN and not os.environ.get('DJANGO_DEBUG', 'True') == 'True':
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            traces_sample_rate=0.1,
            environment="production",
            send_default_pii=False,
        )
    except ImportError:
        pass  # sentry_sdk not installed (e.g. local dev)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'your-secret-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_celery_beat',
    'django_celery_results',
    
    # Local apps
    'apps.users',
    'apps.medications',
    'apps.alerts',
    'apps.health',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

# API 서버에서는 trailing slash 자동 리다이렉트 비활성화
# Next.js 프록시가 슬래시를 제거하는 문제 해결
APPEND_SLASH = False

# 데이터 업로드 크기 제한 (10MB)
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'yaksok'),
        'USER': os.environ.get('POSTGRES_USER', 'postgres'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'postgres'),
        'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Internationalization
LANGUAGE_CODE = 'ko-kr'
TIME_ZONE = 'Asia/Seoul'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

# CORS Settings
# CORS Settings
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS', 
    'http://localhost:3000,http://127.0.0.1:3000'
).split(',')

# Allow ngrok
if DEBUG:
    ALLOWED_HOSTS = ['*']  # 개발 모드에서는 모든 호스트 허용
    CORS_ALLOW_ALL_ORIGINS = True  # 모든 Origin 허용
    CSRF_TRUSTED_ORIGINS = ['https://*.ngrok-free.app', 'https://*.ngrok.io']

# Django Cache Configuration (Redis)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    }
}

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'django-cache'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Seoul'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Celery Beat 스케줄 (매일 실행되는 태스크)
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    'schedule-daily-reminders': {
        'task': 'apps.alerts.tasks.schedule_daily_reminders',
        'schedule': crontab(hour=0, minute=5),  # 매일 00:05 (Asia/Seoul)
        'options': {'queue': 'default'},
    },
    'refresh-youtube-cache': {
        'task': 'apps.health.tasks.refresh_youtube_cache',
        'schedule': crontab(hour=5, minute=0),  # 매일 05:00 (Asia/Seoul)
        'options': {'queue': 'default'},
    },
}

# 개발 환경: Celery 없이 태스크 동기 실행 (Redis/Celery worker 불필요)
CELERY_TASK_ALWAYS_EAGER = DEBUG  # DEBUG=True일 때만 동기 실행








# OpenAI API Key (for OCR structuring, Health Profile)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Upstage API Key (for Document OCR)
UPSTAGE_API_KEY = os.environ.get('UPSTAGE_API_KEY', '')

# YouTube Data API v3
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY', '')

# Safety Line Settings (골든타임 세이프티 라인)
SAFETY_LINE_SETTINGS = {
    'DEFAULT_THRESHOLD_MINUTES': 30,  # 미복약 임계 시간 (분)
    'REMINDER_BEFORE_THRESHOLD': 10,  # 임계 전 리마인더 (분)
    'MAX_RETRY_ALERTS': 3,  # 최대 알림 재시도 횟수
}
