# Yak-Sok (약속)

<div align="center">
  <h3>복약 관리 및 보호자 연결 시스템</h3>
  <p>
    복약자/시니어를 위한 디지털 복약 관리 플랫폼<br />
    보호자 연결을 통한 안전한 복약 모니터링
  </p>
</div>

---

## 프로젝트 소개

**'약속(Yak-Sok)'**은 복약 관리를 필요로 하는 사용자와 보호자를 연결하는 모바일 앱입니다.

- **복약자**: 자신의 약을 관리하는 일반 사용자
- **시니어**: 약 관리 + 보호자에게 모니터링을 받는 사용자
- **보호자**: 연결된 복약자/시니어의 복약 현황을 모니터링하는 사용자

**Neumorphism** 디자인을 적용하여 시니어 사용자에게 높은 시인성과 편안한 인터페이스를 제공합니다.

---

## 주요 기능

### 약 관리
- **처방전 OCR 스캔**: OpenAI Vision 기반으로 처방전 사진에서 약 정보 자동 추출
- **음성 입력**: Whisper 기반 음성 인식으로 약 정보 입력
- **RAG 기반 약 검색**: Pinecone 벡터 DB를 활용한 의약품 정보 검색
- **복용 시간 알림**: FCM 기반 푸시 알림으로 복약 리마인더

### 복약 캘린더
- **월별 복약 현황**: 복약 완료(초록), 일부 복용(노랑), 미복용(빨강) 시각화
- **병원 방문일 표시**: 처방 일수 기반 자동 계산
- **복약 기록 수정**: 날짜별 복약 상태 일괄 수정

### 사용자 연결 시스템
- **초대 코드 연결**: 6자리 코드로 복약자/시니어와 보호자 연결
- **사용자 간 알림**: 연결된 사용자에게 직접 알림 전송 (안부 확인, 도움 요청 등)
- **복약 모니터링**: 보호자가 연결된 복약자/시니어의 복약 현황 확인

### 안전 알림 시스템
- **단계별 알림**: 복약 미확인 시 본인 → 보호자 순차 알림
- **푸시 알림**: Expo Push / FCM 기반 실시간 알림

---

## 사용자 역할별 화면 구성

| 역할 | 탭 구성 | 설명 |
|------|---------|------|
| **복약자** | 홈, 내 약, 캘린더, 설정 (4탭) | 자신의 약만 관리 |
| **시니어** | 홈, 내 약, 캘린더, 설정 (4탭) | 약 관리 + 보호자 연결 |
| **보호자** | 시니어관리, 시니어캘린더, 설정 (3탭) | 연결된 사용자 모니터링 |

---

## 기술 스택

### Mobile
- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Push Notifications**: [Expo Push API](https://docs.expo.dev/push-notifications/overview/)

### Backend
- **Framework**: [Django REST Framework](https://www.django-rest-framework.org/)
- **Language**: [Python 3.11+](https://www.python.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Task Queue**: [Celery](https://docs.celeryq.dev/) + [Redis](https://redis.io/)
- **Vector DB**: [Pinecone](https://www.pinecone.io/) (RAG 검색)

### AI Services
- **OCR/Vision**: [OpenAI GPT-4o](https://openai.com/)
- **STT**: [OpenAI Whisper](https://openai.com/research/whisper)
- **Embedding**: [OpenAI text-embedding-3-small](https://platform.openai.com/docs/guides/embeddings)

---

## 프로젝트 구조

```
yak-sok/
├── backend/                 # Django REST API
│   ├── apps/
│   │   ├── alerts/          # 알림 관리
│   │   ├── medications/     # 약 관리
│   │   └── users/           # 사용자 관리
│   ├── core/                # 설정 파일
│   └── requirements.txt
│
├── mobile/                  # React Native (Expo) 앱
│   ├── app/
│   │   ├── (auth)/          # 로그인/회원가입
│   │   ├── (tabs)/          # 탭 화면들
│   │   └── medications/     # 약 추가/스캔
│   ├── components/          # 공통 컴포넌트
│   └── services/            # API, 상태관리
│
└── docs/                    # 개발 문서
```

---

## 개발 환경 설정

### 필수 요구사항

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Docker (Redis 실행용)
- Expo Go 앱 (모바일 테스트용)

### 1. 저장소 복제

```bash
git clone https://github.com/jongwoo108/yak-sok.git
cd yak-sok
```

### 2. 환경 변수 설정

```bash
# backend/.env
SECRET_KEY=your-secret-key
DEBUG=True

# PostgreSQL
DB_NAME=yaksok
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

# API Keys
OPENAI_API_KEY=your-openai-key
PINECONE_API_KEY=your-pinecone-key

# Redis (Celery)
CELERY_BROKER_URL=redis://localhost:6379/0
```

### 3. 데이터베이스 설정 (PostgreSQL)

```bash
# PostgreSQL에서 데이터베이스 생성
psql -U postgres
CREATE DATABASE yaksok;
\q
```

---

## 전체 서비스 실행 순서

> 알림 기능을 사용하려면 **4개의 터미널**에서 각각 서비스를 실행해야 합니다.

### 터미널 1: Redis 실행

```bash
# Docker로 Redis 실행
docker run -d -p 6379:6379 --name redis redis

# 이미 컨테이너가 있으면
docker start redis
```

### 터미널 2: Django 백엔드

```bash
cd backend

# 가상환경 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 패키지 설치 (최초 1회)
pip install -r requirements.txt

# 데이터베이스 마이그레이션 (최초 1회 또는 모델 변경 시)
python manage.py migrate

# 서버 실행
python manage.py runserver 0.0.0.0:8000
```

### 터미널 3: Celery Worker (알림용)

```bash
cd backend

# 가상환경 활성화
source venv/bin/activate  # Windows: venv\Scripts\activate

# Celery 실행
# Windows
celery -A core worker -l info --pool=solo

# Mac/Linux
celery -A core worker -l info
```

### 터미널 4: 모바일 앱 (Expo)

```bash
cd mobile

# 패키지 설치 (최초 1회)
npm install

# Expo 개발 서버 실행
npx expo start
```

---

## 실행 확인

### 서비스 상태 확인

| 서비스 | URL / 확인 방법 | 설명 |
|--------|-----------------|------|
| Redis | `docker ps` | redis 컨테이너 running 확인 |
| Django | http://localhost:8000/api | API 응답 확인 |
| Django Admin | http://localhost:8000/admin | 관리자 페이지 |
| Celery | 터미널에서 `ready` 메시지 확인 | Worker 준비 상태 |
| Mobile | Expo Go 앱에서 QR 스캔 | 모바일 앱 실행 |

### 알림 기능 테스트

1. Redis가 실행 중인지 확인
2. Celery Worker가 `ready` 상태인지 확인
3. 앱에서 알림 전송 → Celery 터미널에서 태스크 로그 확인

---

## API 엔드포인트

### 인증
- `POST /api/users/register/` - 회원가입
- `POST /api/users/login/` - 로그인

### 약 관리
- `GET /api/medications/` - 약 목록
- `POST /api/medications/` - 약 추가
- `POST /api/medications/scan/` - 처방전 OCR
- `GET /api/medications/search/?q=` - RAG 검색

### 캘린더
- `GET /api/medications/calendar/` - 복약 캘린더
- `POST /api/medications/logs/batch_update/` - 복약 기록 일괄 수정

### 사용자 연결
- `GET/POST /api/users/invite/` - 초대 코드 조회/생성
- `POST /api/users/invite/accept/` - 초대 코드로 연결
- `GET /api/users/connections/` - 연결된 사용자 목록

### 알림
- `POST /api/alerts/send/` - 사용자 간 알림 전송

---

## 문서

자세한 개발 문서는 `docs/` 폴더를 참조하세요.

| 문서 | 설명 |
|------|------|
| [01_project_structure.md](docs/01_project_structure.md) | 프로젝트 구조 |
| [02_backend_development.md](docs/02_backend_development.md) | 백엔드 개발 |
| [04_api_specification.md](docs/04_api_specification.md) | API 명세 |
| [06_ui_design_system.md](docs/06_ui_design_system.md) | UI 디자인 시스템 |
| [08_calendar_feature.md](docs/08_calendar_feature.md) | 캘린더 기능 |
| [09_notification_system.md](docs/09_notification_system.md) | 알림 시스템 |
| [10_role_structure.md](docs/10_role_structure.md) | 역할 구조 |

---

## 라이선스

이 프로젝트의 모든 권리는 저작권자에게 있습니다.

```
Copyright (c) 2026 Jongwoo Shin. All Rights Reserved.
```

무단 복제, 배포, 수정을 금지합니다. 사용 허가가 필요한 경우 저작권자에게 문의하세요.

---

<div align="center">
  <sub>Built by <a href="https://github.com/jongwoo108">Jongwoo Shin</a></sub>
</div>
