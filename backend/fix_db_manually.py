import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def add_column():
    with connection.cursor() as cursor:
        try:
            print("Trying to add 'is_severe' column to medications_medicationgroup...")
            cursor.execute("ALTER TABLE medications_medicationgroup ADD COLUMN is_severe BOOLEAN DEFAULT FALSE;")
            print("SUCCESS: Column added.")
        except Exception as e:
            print(f"FAILED or already exists: {e}")
            
    # Also mark the migration as applied in django_migrations table if it exists
    with connection.cursor() as cursor:
        try:
            print("Marking migration 0003 as applied...")
            from django.utils import timezone
            cursor.execute(
                "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s);",
                ['medications', '0003_medicationgroup_is_severe', timezone.now()]
            )
            print("SUCCESS: Migration marked as applied.")
        except Exception as e:
            print(f"FAILED to mark migration: {e}")

if __name__ == "__main__":
    add_column()
