from django.apps import AppConfig


class AlertsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.alerts'
    verbose_name = '비상 알림 (Safety Line)'

    def ready(self):
        # Firebase Admin SDK 초기화
        try:
            from .fcm_service import FCMService
            FCMService.initialize()
        except ImportError:
            pass
