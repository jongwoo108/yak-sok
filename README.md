# Yak-Sok (약속)

<div align="center">
  <h3>시니어를 위한 골든타임 세이프티 라인</h3>
  <p>
    노인 복약 관리 및 응급 대응 시스템<br />
    고령화 사회를 위한 디지털 안전망 구축
  </p>
</div>

## 프로젝트 소개 (About Yak-Sok)
**약속(Yak-Sok)**은 복약 순응도를 단순한 건강 지표가 아닌, 핵심적인 **"생존 신호 (Life-Sign)"**로 해석합니다. 이 프로젝트는 어르신들의 디지털 소외 문제를 해결함과 동시에, 강력한 사회 안전망을 구축하는 것을 목표로 합니다.

**"3D 파스텔 클레이모피즘 (Claymorphism)"** 디자인 언어를 적용하여, 시니어 사용자에게는 높은 시인성과 편안한 인터페이스를, 보호자에게는 정교한 모니터링 대시보드를 제공합니다.
![제목 없는 디자인](https://github.com/user-attachments/assets/4a0c8141-2f35-40bc-b02e-76560e6bb1de)

---
## 주요 기능 (Features)

#### 👴 시니어 중심 경험 (Senior-Centric Experience)
- **접근성 설계 (Accessible Design)**: 고대비 색상, 대형 터치 영역(최소 48px), 인지 부하를 최소화한 직관적 인터페이스를 제공합니다.
- **자동 입력 자동화**: OpenAI Vision 기반의 처방전 OCR과 Whisper 음성 인식(STT)을 통해 복잡한 입력 과정을 자동화했습니다.
- **PWA 지원**: 앱스토어 다운로드 없이 홈 화면에 설치하여 네이티브 앱처럼 사용할 수 있으며, 오프라인 환경을 지원합니다.

#### 🛡️ 골든타임 세이프티 라인 (Safety Line)
- **실시간 모니터링**: 복약 누락을 실시간으로 감지하여 이상 징후를 포착합니다.
- **단계별 알림 시스템 (Hierarchical Alerts)**:
  - **1단계**: 시니어 사용자에게 부드러운 리마인더 발송
  - **2단계**: 등록된 보호자에게 Firebase Cloud Messaging (FCM) 기반 긴급 알림 전송
  - **3단계**: 응급 연락망 프로토콜 가동 (예정)

#### 🔐 보안 및 인증 (Security & Auth)
- **역할 기반 접근 제어 (RBAC)**: 시니어와 보호자를 구분하여 최적화된 인터페이스와 권한을 부여합니다.
- **안전한 인증**: Firebase Admin 검증을 거친 Google OAuth 로그인을 통해 강력한 보안을 보장합니다.
---
## 기술 스택 (Tech Stack)

- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router), [TypeScript](https://www.typescriptlang.org/), [Zustand](https://github.com/pmndrs/zustand), [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Django REST Framework](https://www.django-rest-framework.org/), [Python 3.11+](https://www.python.org/)
- **Infrastructure**: [Docker](https://www.docker.com/), [PostgreSQL](https://www.postgresql.org/), [Redis](https://redis.io/), [Celery](https://docs.celeryq.dev/)
- **AI Services**: [OpenAI GPT-4o](https://openai.com/) (Vision), [Whisper](https://openai.com/research/whisper)
---
## 개발자 빠른 시작 (Developer Quickstart)

로컬 환경에서 실행하려면 **Docker**와 **Docker Compose**가 설치되어 있어야 합니다.

#### 1. 저장소 복제 (Clone)
```bash
git clone https://github.com/jongwoo108/yak-sok.git
cd yak-sok
```

#### 2. 환경 변수 설정
예제 파일을 복사한 뒤, 필요한 API Key (OpenAI, Firebase)를 설정하세요.
```bash
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
```

#### 3. 도커 실행
Backend (Django), Frontend (Next.js), PostgreSQL, Redis 컨테이너를 한 번에 실행합니다.
```bash
docker-compose up -d --build
```

##### 접속 정보
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000/api](http://localhost:8000/api)
- **Admin Panel**: [http://localhost:8000/admin](http://localhost:8000/admin)
---
### 기여하기 (Contributing)
기여는 언제나 환영합니다! 버그 제보, 기능 제안, PR 제출 방법은 [CONTRIBUTING.md](docs/CONTRIBUTING.md)를 참고해 주세요.

### 라이선스 (License)
이 프로젝트는 **MIT License**를 따릅니다.

---
<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/jongwoo108">Jongwoo Shin</a></sub>
</div>
