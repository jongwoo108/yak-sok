import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print("Checking users...", flush=True)
users = User.objects.all()
for u in users:
    has_token = bool(u.fcm_token)
    print(f"User: {u.email}, Has Token: {has_token}", flush=True)
    if has_token:
        print(f"  Token: {u.fcm_token[:20]}...", flush=True)
