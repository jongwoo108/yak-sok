# 05. 배포 가이드

> 작성일: 2026-01-09

## Docker 기반 배포

### 사전 요구 사항

- Docker 20.10+
- Docker Compose 2.0+

### 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일 편집:

```env
# Django
DJANGO_SECRET_KEY=your-production-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-domain.com,api.your-domain.com

# Database
POSTGRES_DB=yaksok
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure-password-here
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis
CELERY_BROKER_URL=redis://redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://your-domain.com

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Firebase (옵션)
FIREBASE_CREDENTIALS=/app/firebase-credentials.json
```

### Docker Compose 실행

```bash
# 전체 서비스 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

### 서비스 구성

| 서비스 | 포트 | 설명 |
|--------|------|------|
| `db` | 5432 | PostgreSQL 데이터베이스 |
| `redis` | 6379 | Redis (Celery 브로커) |
| `backend` | 8000 | Django REST API |
| `celery_worker` | - | Celery 워커 |
| `celery_beat` | - | Celery 스케줄러 |
| `frontend` | 3000 | Next.js 프론트엔드 |

---

## 개별 배포

### 백엔드 (Django)

```bash
cd backend

# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
export DJANGO_SETTINGS_MODULE=core.settings
export DJANGO_SECRET_KEY=your-secret-key
# ... 기타 환경 변수

# 마이그레이션
python manage.py migrate

# 정적 파일 수집
python manage.py collectstatic --noinput

# Gunicorn으로 실행
gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### 프론트엔드 (Next.js)

```bash
cd frontend

# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

---

## Nginx 리버스 프록시 설정

```nginx
# /etc/nginx/sites-available/yaksok

upstream backend {
    server 127.0.0.1:8000;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }

    # Static files
    location /static/ {
        alias /var/www/yaksok/backend/staticfiles/;
    }

    # Media files
    location /media/ {
        alias /var/www/yaksok/backend/media/;
    }
}
```

---

## 데이터베이스 백업

```bash
# 백업
docker exec yaksok-db pg_dump -U postgres yaksok > backup_$(date +%Y%m%d).sql

# 복원
cat backup_20260109.sql | docker exec -i yaksok-db psql -U postgres -d yaksok
```

---

## 모니터링

### 로그 확인

```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
docker-compose logs -f celery_worker

# Django 에러 로그
docker exec yaksok-backend tail -f /app/logs/error.log
```

### 헬스체크

```bash
# 백엔드 상태 확인
curl http://localhost:8000/api/

# Celery 상태 확인
docker exec yaksok-celery-worker celery -A core inspect active
```

---

## 트러블슈팅

### 데이터베이스 연결 실패

```bash
# PostgreSQL 컨테이너 상태 확인
docker-compose ps db

# 연결 테스트
docker exec -it yaksok-db psql -U postgres -d yaksok
```

### Celery 태스크 실행 안됨

```bash
# Redis 연결 확인
docker exec -it yaksok-redis redis-cli ping

# 대기 중인 태스크 확인
docker exec yaksok-celery-worker celery -A core inspect reserved
```

### 정적 파일 404

```bash
# 정적 파일 재수집
docker exec yaksok-backend python manage.py collectstatic --noinput

# Nginx 재시작
sudo nginx -t && sudo systemctl reload nginx
```

---

## 보안 체크리스트

- [ ] `DJANGO_DEBUG=False` 설정
- [ ] 강력한 `SECRET_KEY` 사용
- [ ] HTTPS 적용 (Let's Encrypt)
- [ ] 데이터베이스 비밀번호 변경
- [ ] CORS 허용 도메인 제한
- [ ] 방화벽 설정 (필요한 포트만 개방)
- [ ] 정기적인 백업 설정
