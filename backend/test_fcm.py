import os
import django
import sys

# Add the project directory to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.alerts.fcm_service import FCMService

# Token from the user's logs
token = "dpVlMrWQD7WOm0Nad3q8dJ:APA91bFkyvH-s0rfWRDk27PLxA7OsWhIBgmJYG_bgc_w_IddSf3tM7DLbbxXHNaWqLm6hleFvh_-Q88dchd_ZwYhiP_sB_zUvTh1JjgsrU_P2gCxKcgx4H4"

print(f"Sending test notification to: {token[:20]}...")

# 1. Send generic test notification
print("\n1. Sending generic test notification...")
success = FCMService.send_notification(
    token=token,
    title="Yak-Sok 테스트 알림",
    body="백엔드에서 발송한 테스트 알림입니다.",
    data={"type": "test"}
)
print(f"Result: {'Success' if success else 'Failed'}")

# 2. Send medication reminder test
print("\n2. Sending medication reminder test...")
success = FCMService.send_medication_reminder(
    token=token,
    medication_name="비타민 C",
    time_of_day="morning"
)
print(f"Result: {'Success' if success else 'Failed'}")
