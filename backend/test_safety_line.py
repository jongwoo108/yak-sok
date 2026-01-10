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
    
    # 1. Setup Data
    print("\n1. Setting up test data...")
    user_email = f"testuser_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
    user = User.objects.create_user(username=user_email, email=user_email, password="password123")
    user.fcm_token = "dpVlMrWQD7WOm0Nad3q8dJ:APA91bFkyvH-s0rfWRDk27PLxA7OsWhIBgmJYG_bgc_w_IddSf3tM7DLbbxXHNaWqLm6hleFvh_-Q88dchd_ZwYhiP_sB_zUvTh1JjgsrU_P2gCxKcgx4H4"
    user.save()
    print(f"Created user: {user.username}")

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
