import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def check_field():
    with connection.cursor() as cursor:
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'medications_medicationgroup';")
        columns = [row[0] for row in cursor.fetchall()]
        print(f"Columns in medications_medicationgroup: {columns}")
        if 'is_severe' in columns:
            print("SUCCESS: 'is_severe' field exists.")
        else:
            print("ERROR: 'is_severe' field NOT found.")

if __name__ == "__main__":
    check_field()
