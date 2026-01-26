# AWS Lightsail 배포 가이드

> 업데이트: 2026-01-18

## 📋 배포 정보

| 항목 | 값 |
|------|-----|
| 도메인 | `yaksok-care.com` |
| API URL | `https://yaksok-care.com/api/` |
| 서버 | AWS Lightsail (2GB RAM, $12/월) |
| 리전 | Seoul (ap-northeast-2) |
| 고정 IP | `<서버 IP>` (docs/SENSITIVE_INFO.md 참고) |

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                 yaksok-care.com                      │
├─────────────────────────────────────────────────────┤
│  Nginx (SSL) → Port 80/443                          │
│       ↓                                              │
│  Docker Compose                                      │
│  ├─ PostgreSQL (db)                                 │
│  ├─ Redis (redis)                                   │
│  ├─ Django Backend (backend:8000)                   │
│  ├─ Celery Worker (celery_worker)                   │
│  └─ Celery Beat (celery_beat)                       │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 SSH 접속

```bash
# 실제 정보는 docs/SENSITIVE_INFO.md 참고
ssh -i <SSH 키 경로> ubuntu@<서버 IP>
```

---

## 🚀 배포 명령어

### 수동 배포

```bash
cd /app/yak-sok
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build backend celery_worker celery_beat
```

### 서비스 재시작

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

### 로그 확인

```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## 📁 주요 파일 위치

| 파일 | 경로 |
|------|------|
| 환경변수 | `/app/yak-sok/.env` |
| Nginx 설정 | `/etc/nginx/sites-available/yaksok` |
| SSL 인증서 | `/etc/letsencrypt/live/yaksok-care.com/` |

---

## 🔧 환경 변수 (.env)

```env
DJANGO_SECRET_KEY=<시크릿키>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=3.39.142.149,localhost,127.0.0.1,yaksok-care.com

POSTGRES_DB=yaksok
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<비밀번호>
POSTGRES_HOST=db
POSTGRES_PORT=5432

CELERY_BROKER_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081

OPENAI_API_KEY=<OpenAI 키>
PINECONE_API_KEY=<Pinecone 키>
PINECONE_INDEX_NAME=medications

SENTRY_DSN=<Sentry DSN>
FIREBASE_CREDENTIALS=/app/firebase-credentials.json
DATA_GO_KR_API_KEY=<공공데이터 키>
```

---

## 🔒 SSL 인증서 갱신

Let's Encrypt 인증서는 자동 갱신됩니다.

수동 갱신:
```bash
sudo certbot renew
```

---

## 📊 모니터링

| 서비스 | 용도 |
|--------|------|
| Sentry | 에러 트래킹 |
| CloudWatch | 서버 메트릭 |

---

## 🚨 문제 해결

### 컨테이너 상태 확인
```bash
docker-compose -f docker-compose.prod.yml ps
```

### 완전 재시작
```bash
docker kill $(docker ps -q) 2>/dev/null
docker rm -f $(docker ps -aq) 2>/dev/null
docker-compose -f docker-compose.prod.yml up -d db redis backend celery_worker celery_beat
```

### Nginx 재시작
```bash
sudo systemctl restart nginx
```
