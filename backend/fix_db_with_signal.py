import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def add_column():
    try:
        with connection.cursor() as cursor:
            # 1. Check if column exists
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'medications_medicationgroup' AND column_name = 'is_severe';")
            if cursor.fetchone():
                print("Already exists.")
            else:
                cursor.execute("ALTER TABLE medications_medicationgroup ADD COLUMN is_severe BOOLEAN DEFAULT FALSE;")
                print("Added.")
        
        # 2. Mark migration as applied
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM django_migrations WHERE name = '0003_medicationgroup_is_severe';")
            if not cursor.fetchone():
                from django.utils import timezone
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s);",
                    ['medications', '0003_medicationgroup_is_severe', timezone.now()]
                )
        
        # 3. Create success file
        open('db_success.txt', 'w').write('applied')
        return True
    except Exception as e:
        open('db_error.txt', 'w').write(str(e))
        return False

if __name__ == "__main__":
    add_column()
