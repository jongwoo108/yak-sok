import os
import django
from django.utils import timezone
import datetime
import time

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.medications.models import Medication, MedicationSchedule, MedicationLog
from apps.alerts.models import Alert
from apps.alerts.tasks import schedule_medication_alert, send_push_notification

User = get_user_model()

def run_test():
    print("\n[Safety Line Integration Test Start]")
    
    import time
    
    # 1. Setup Data
    print("\n1. Setting up test data...")
    user_email = f"testuser_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
    user_password = "password123"
    
    # Check if user already exists
    if not User.objects.filter(email=user_email).exists():
        user = User.objects.create_user(username=user_email, email=user_email, password=user_password)
    else:
        user = User.objects.get(email=user_email)

    # user.fcm_token = "..." # 이전에 로그에서 복사한 토큰이 있다면 사용, 없으면 아래 로직대로
    
    # 주의: 실제 테스트를 위해서는 프론트엔드에서 발급받은 '내 기기의 실제 토큰'이 DB에 있어야 합니다.
    # 이 스크립트는 '새로운 유저'를 만들기 때문에, 내 브라우저의 토큰과 연결되지 않습니다.
    # 해결책: 내 기기의 토큰을 하드코딩하거나, 가장 최근에 업데이트된 유저의 토큰을 가져와야 합니다.
    
    print("Most recent user's token will be used if available.")
    last_user = User.objects.exclude(fcm_token__isnull=True).exclude(fcm_token='').order_by('-date_joined').first()
    
    if last_user and last_user.fcm_token:
        target_token = last_user.fcm_token
        print(f"Using token from user {last_user.username}: {target_token[:20]}...")
        user.fcm_token = target_token
        user.save()
    else:
        # Fallback to the hardcoded one if no user has a token (for initial test)
        user.fcm_token = "dpVlMrWQD7WOm0Nad3q8dJ:APA91bFkyvH-s0rfWRDk27PLxA7OsWhIBgmJYG_bgc_w_IddSf3tM7DLbbxXHNaWqLm6hleFvh_-Q88dchd_ZwYhiP_sB_zUvTh1JjgsrU_P2gCxKcgx4H4"
        print("Using hardcoded fallback token.")
        user.save()

    medication = Medication.objects.create(
        user=user,
        name="Test Pill (Safety Line)",
        dosage="10mg"
    )
    
    schedule = MedicationSchedule.objects.create(
        medication=medication,
        scheduled_time=datetime.time(9, 0),
        time_of_day='morning'
    )
    print(f"Created schedule: {schedule}")

    # Create a log that is 'pending' and scheduled for NOW (or slightly past)
    log = MedicationLog.objects.create(
        schedule=schedule,
        scheduled_datetime=timezone.now() - datetime.timedelta(minutes=31), # 30분 경과 시뮬레이션
        status='pending'
    )

    print(f"Created medication log: ID {log.id}")

    # 2. Test Scheduling Alert
    print("\n2. Testing schedule_medication_alert()...")
    
    # Call the task synchronously
    result = schedule_medication_alert(log.id)

    print(f"Task result: {result}")
    
    # Verify Alert creation
    alert = Alert.objects.filter(medication_log=log).first()
    if alert:
        print(f"Alert created: {alert}")
    else:
        print("Alert NOT created!")

    # 3. Test Manual Push with Severity
    print("\n3. Testing manual push with different severities...")
    
    severities = [
        ('reminder', '약속 알림', '이것은 일반 복약 알림입니다. (파란색)'),
        ('warning', '약속 경고', '복약 시간이 30분 지났습니다! (주황색)'),
        ('emergency', '약속 비상', '1시간째 응답이 없어 보호자에게 알림을 보냈습니다! (빨간색+펄스)')
    ]
    
    print("\n>>> 5초 뒤에 알림 테스트를 시작합니다! 브라우저 창을 활성화(클릭)하고 기다려주세요! <<<")
    for i in range(5, 0, -1):
        print(f"{i}...", end=" ", flush=True)
        time.sleep(1)
    
    for sev, title, body in severities:
        print(f"\n[{sev.upper()}] 발송합니다...")
        send_push_notification(
            user_id=user.id,
            title=title,
            message=body,
            severity=sev
        )
        print(f"Sent {sev} notification!")
        time.sleep(4) # 사용자가 UI를 확인할 시간 확보

    print("\n[Test Finished]")

if __name__ == "__main__":
    run_test()
