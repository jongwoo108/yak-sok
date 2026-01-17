# AWS Lightsail 배포 가이드

> 작성일: 2026-01-18

## 📋 개요

Yak-Sok 서비스를 AWS Lightsail에 배포하기 위한 가이드입니다.

---

## 🏗️ 인프라 구성

### 서비스 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                  AWS Lightsail                       │
│  ┌─────────────────────────────────────────────┐    │
│  │           yaksok-server ($7/월)              │    │
│  │  ┌─────────┐ ┌────────┐ ┌──────────────┐   │    │
│  │  │  Nginx  │→│ Django │→│ Celery Worker│   │    │
│  │  └─────────┘ └────────┘ └──────────────┘   │    │
│  │       ↓           ↓            ↓           │    │
│  │  ┌─────────────────────────────────────┐   │    │
│  │  │    Redis    │    PostgreSQL (외부)   │   │    │
│  │  └─────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 리소스 정보

| 리소스 | 사양 | 비용 |
|--------|------|------|
| Lightsail Instance | 1GB RAM, 2 vCPU, 40GB SSD | $7/월 |
| Lightsail Database | 1GB RAM PostgreSQL (선택) | $15/월 |
| Route 53 | 호스팅 영역 | $0.50/월 |
| **합계** | | **$7~22.50/월** |

---

## 🔐 IAM 계정 구성

| 계정 | 용도 | 권한 |
|------|------|------|
| yaksok-admin | 관리자 | AdministratorAccess |
| yaksok-dev-{name} | 개발자 | S3, CloudWatch |
| yaksok-cicd | GitHub Actions | 최소 권한 |
| yaksok-app | 애플리케이션 | S3, CloudWatch Logs |

---

## 🚀 인스턴스 초기 설정

### 1. SSH 접속

```bash
# SSH 키 권한 설정
chmod 400 LightsailDefaultKey-ap-northeast-2.pem

# SSH 접속
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@<인스턴스-IP>
```

### 2. Docker 설치

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치
sudo apt install -y docker.io docker-compose

# Docker 그룹에 사용자 추가
sudo usermod -aG docker ubuntu

# 재접속 후 확인
docker --version
```

### 3. 프로젝트 클론

```bash
# 프로젝트 디렉토리 생성
sudo mkdir -p /app
sudo chown ubuntu:ubuntu /app
cd /app

# Git 클론
git clone https://github.com/jongwoo108/yak-sok.git
cd yak-sok
```

### 4. 환경 변수 설정

```bash
cp .env.example .env
nano .env
```

```env
# Django
DJANGO_SECRET_KEY=<강력한-시크릿-키>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-domain.com,<인스턴스-IP>

# Database
POSTGRES_DB=yaksok
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<DB-비밀번호>
POSTGRES_HOST=db  # Docker 내부 또는 외부 DB 호스트
POSTGRES_PORT=5432

# Redis
CELERY_BROKER_URL=redis://redis:6379/0

# API Keys
OPENAI_API_KEY=<OpenAI-API-키>
PINECONE_API_KEY=<Pinecone-API-키>
PINECONE_INDEX_NAME=medications
```

### 5. 서비스 실행

```bash
# 프로덕션 모드로 실행
docker-compose -f docker-compose.prod.yml up -d --build

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🌐 네트워킹 설정

### 고정 IP 연결

1. Lightsail 콘솔 → 인스턴스 선택
2. **Networking** 탭
3. **Create static IP** 클릭
4. 이름: `yaksok-static-ip`

### 방화벽 규칙

| 포트 | 프로토콜 | 용도 |
|------|----------|------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP |
| 443 | TCP | HTTPS |

### 도메인 연결 (Route 53)

```
A 레코드: your-domain.com → <고정-IP>
CNAME: www.your-domain.com → your-domain.com
```

---

## 🔒 SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot

# 인증서 발급 (Docker 중지 필요)
docker-compose -f docker-compose.prod.yml down
sudo certbot certonly --standalone -d your-domain.com

# Docker 재시작
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 모니터링

### CloudWatch 기본 메트릭
- CPU 사용률
- 네트워크 I/O
- 디스크 사용량

### 권장 알람 설정

| 메트릭 | 임계값 | 알림 |
|--------|--------|------|
| CPU | > 80% | 이메일 |
| 메모리 | > 85% | 이메일 |
| 디스크 | > 80% | 이메일 |

---

## 🔄 배포 명령어

### 수동 배포

```bash
ssh -i <키파일> ubuntu@<IP>
cd /app/yak-sok
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

### 서비스 관리

```bash
# 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f backend

# 재시작
docker-compose -f docker-compose.prod.yml restart

# 중지
docker-compose -f docker-compose.prod.yml down
```

---

## 📝 체크리스트

### 배포 전

- [ ] `.env` 파일 설정 완료
- [ ] `DJANGO_DEBUG=False` 확인
- [ ] `DJANGO_SECRET_KEY` 강력한 키로 변경
- [ ] 방화벽 규칙 확인
- [ ] SSL 인증서 발급

### 배포 후

- [ ] API 응답 확인: `curl https://your-domain.com/api/`
- [ ] Admin 페이지 접근 확인
- [ ] 로그 에러 확인
- [ ] 모니터링 알람 설정
