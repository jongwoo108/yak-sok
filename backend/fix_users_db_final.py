import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def fix_users():
    with connection.cursor() as cursor:
        # Add emergency_relation
        try:
            print("Adding 'emergency_relation' column to users_user...")
            cursor.execute("ALTER TABLE users_user ADD COLUMN emergency_relation VARCHAR(50) DEFAULT '';")
            print("SUCCESS: emergency_relation added.")
        except Exception as e:
            print(f"FAILED or already exists: {e}")

        # Add emergency_name
        try:
            print("Adding 'emergency_name' column to users_user...")
            cursor.execute("ALTER TABLE users_user ADD COLUMN emergency_name VARCHAR(50) DEFAULT '';")
            print("SUCCESS: emergency_name added.")
        except Exception as e:
            print(f"FAILED or already exists: {e}")
            
    # Mark the migration as applied
    with connection.cursor() as cursor:
        try:
            print("Marking migration 0002 as applied...")
            from django.utils import timezone
            # Check if record exists first
            cursor.execute("SELECT id FROM django_migrations WHERE app='users' AND name='0002_add_emergency_fields';")
            if cursor.fetchone():
                print("Migration 0002 already marked as applied.")
            else:
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s);",
                    ['users', '0002_add_emergency_fields', timezone.now()]
                )
                print("SUCCESS: Migration 0002 marked as applied.")
        except Exception as e:
            print(f"FAILED to mark migration: {e}")

if __name__ == "__main__":
    fix_users()
