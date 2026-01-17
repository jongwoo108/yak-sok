import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def fix_db():
    conn = None
    try:
        # DB 연결 정보
        dbname = os.getenv('POSTGRES_DB', 'yaksok')
        user = os.getenv('POSTGRES_USER', 'postgres')
        password = os.getenv('POSTGRES_PASSWORD', 'password')
        host = os.getenv('POSTGRES_HOST', 'localhost')
        port = os.getenv('POSTGRES_PORT', '5432')

        print(f"Connecting to {dbname} at {host}:{port}...")
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.autocommit = True
        cur = conn.cursor()

        # 1. 컬럼 존재 확인 및 추가
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'medications_medicationgroup' AND column_name = 'is_severe';")
        if cur.fetchone():
            res1 = "Already exists."
        else:
            cur.execute("ALTER TABLE medications_medicationgroup ADD COLUMN is_severe BOOLEAN DEFAULT FALSE;")
            res1 = "Column added."
        
        # 2. 마이그레이션 기록 (선택 사항이지만 안전을 위해)
        cur.execute("SELECT name FROM django_migrations WHERE name = '0003_medicationgroup_is_severe';")
        if cur.fetchone():
            res2 = "Record exists."
        else:
            from datetime import datetime
            cur.execute(
                "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s);",
                ['medications', '0003_medicationgroup_is_severe', datetime.now()]
            )
            res2 = "Record added."
        
        # 성공 기록
        with open('final_fix_success.txt', 'w') as f:
            f.write(f"{res1}\n{res2}")
        print("FIX APPLIED SUCCESSFULLY")

    except Exception as e:
        with open('final_fix_error.txt', 'w') as f:
            f.write(str(e))
        print(f"FIX FAILED: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_db()
