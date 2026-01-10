import os
import django
import sys
import datetime
from django.utils import timezone

# Add the project directory to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.medications.models import Medication, MedicationSchedule, MedicationLog
from apps.alerts.models import Alert
from apps.alerts.tasks import schedule_medication_alert, trigger_safety_alert, revoke_alert_task
from django.conf import settings

User = get_user_model()

def run_test():
    print("\n[Safety Line Integration Test Start]")
    
    import time
    
    # 1. Setup Data
    print("\n1. Setting up test data...")
    user_email = f"testuser_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
    user = User.objects.create_user(username=user_email, email=user_email, password="password123")
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
    print(f"Created medication: {medication.name}")

    schedule = MedicationSchedule.objects.create(
        medication=medication,
        time_of_day=MedicationSchedule.TimeOfDay.MORNING,
        scheduled_time=datetime.time(9, 0)
    )
    print(f"Created schedule: {schedule.time_of_day} at {schedule.scheduled_time}")

    # Create a log for today at 9:00 AM (which is in the past or future depending on run time, logic handles threshold)
    # We simulate a log that is supposed to be taken NOW
    now = timezone.now()
    log = MedicationLog.objects.create(
        schedule=schedule,
        scheduled_datetime=now,
        status=MedicationLog.Status.PENDING
    )
    print(f"Created medication log: ID {log.id}")


    # 2. Test Scheduling Alert
    print("\n2. Testing schedule_medication_alert()...")
    
    print("\n>>> 5초 뒤에 알림을 보냅니다! 브라우저 창을 활성화(클릭)하고 기다려주세요! <<<")
    for i in range(5, 0, -1):
        print(f"{i}...", end=" ", flush=True)
        time.sleep(1)
    print("발송!")

    # Call the task synchronously
    result = schedule_medication_alert(log.id)

    print(f"Task result: {result}")
    
    # Verify Alert creation
    alerts = Alert.objects.filter(medication_log=log)
    if alerts.exists():
        alert = alerts.first()
        print(f"SUCCESS: Alert created with ID {alert.id}")
        print(f"  - Title: {alert.title}")
        print(f"  - Message: {alert.message}")
        print(f"  - Scheduled At: {alert.scheduled_at}")
        print(f"  - Celery Task ID: {alert.celery_task_id}")
    else:
        print("FAILED: Alert was not created.")
        return

    # 3. Test Triggering Alert (Simulation)
    print("\n3. Testing trigger_safety_alert()...")
    # In real world this is called by Celery. We call it manually.
    trigger_result = trigger_safety_alert(alert.id)
    print(f"Trigger result: {trigger_result}")
    
    alert.refresh_from_db()
    if alert.status == Alert.Status.SENT:
         print(f"SUCCESS: Alert status updated to '{alert.status}'")
         print("  (Check your device/console for actual FCM notification)")
    else:
         print(f"FAILED: Alert status is {alert.status}")


    # 4. Test Revocation (Medication Taken)
    print("\n4. Testing alert revocation (medication taken)...")
    
    # Create another log/alert for revocation test
    log_v2 = MedicationLog.objects.create(
        schedule=schedule,
        scheduled_datetime=now + datetime.timedelta(hours=1),
        status=MedicationLog.Status.PENDING
    )
    result_v2 = schedule_medication_alert(log_v2.id)
    alert_v2 = Alert.objects.get(medication_log=log_v2)
    task_id = alert_v2.celery_task_id
    
    print(f"Created new alert {alert_v2.id} with task_id {task_id}")
    
    # Simulate user taking medication -> which should call revoke
    # We call revoke manually to test the function logic
    revoke_result = revoke_alert_task(task_id)
    print(f"Revoke result: {revoke_result}")
    
    alert_v2.refresh_from_db()
    if alert_v2.status == Alert.Status.CANCELLED:
        print(f"SUCCESS: Alert status updated to '{alert_v2.status}'")
    else:
        print(f"FAILED: Alert status is {alert_v2.status}")

    print("\n[Test Complete]")

if __name__ == "__main__":
    run_test()
