import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def check_users():
    with connection.cursor() as cursor:
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users_user';")
        columns = [row[0] for row in cursor.fetchall()]
        print(f"Columns in users_user: {columns}")
        if 'emergency_relation' in columns and 'emergency_name' in columns:
            print("VERIFICATION SUCCESS: Columns exist.")
        else:
            print("VERIFICATION FAILURE: Columns missing.")

if __name__ == "__main__":
    check_users()
