import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.alerts.models import Alert
from apps.medications.models import MedicationLog

print("-" * 30)
print(f"Total Alerts: {Alert.objects.count()}")
recent_alerts = Alert.objects.order_by('-created_at')[:5]
for alert in recent_alerts:
    print(f"Alert ID: {alert.id}")
    print(f"  Title: {alert.title}")
    print(f"  Status: {alert.status}")
    print(f"  Scheduled: {alert.scheduled_at}")
    print(f"  Celery Task ID: {alert.celery_task_id}")
    print("-" * 10)

print(f"Total Logs: {MedicationLog.objects.count()}")
