# CI/CD 파이프라인

> 업데이트: 2026-02-03

## 📋 개요

GitHub Actions를 통한 자동 배포 파이프라인입니다.

---

## 🔄 배포 플로우

```
main 브랜치 push → GitHub Actions → SSH 배포 → 서버 업데이트
```

---

## 🔐 GitHub Secrets

Repository → Settings → Secrets and variables → Actions

| Secret | 값 |
|--------|-----|
| `LIGHTSAIL_HOST` | `<서버 IP>` (docs/SENSITIVE_INFO.md 참고) |
| `SSH_PRIVATE_KEY` | SSH 키 전체 내용 |

---

## 📝 Workflow 파일

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Lightsail

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'docker-compose.prod.yml'
      - '.github/workflows/deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Lightsail
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.LIGHTSAIL_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app/yak-sok
            git pull origin main
            docker-compose -f docker-compose.prod.yml up -d --build backend celery_worker celery_beat
            docker image prune -f
```

---

## 🧪 트리거 조건

| 조건 | 배포 실행 |
|------|----------|
| `backend/` 변경 | ✅ |
| `docker-compose.prod.yml` 변경 | ✅ |
| `mobile/` 변경 | ❌ |
| `docs/` 변경 | ❌ |

---

## 📊 확인

GitHub → Actions 탭에서 워크플로우 실행 상태 확인
- ✅ 녹색: 성공
- ❌ 빨간색: 실패 (로그 확인)

---

## ⏱ 배포 시 서비스 중단

**현재 방식**: 배포 시 **잠깐(수 초~수십 초) 서비스가 끊깁니다.**

| 단계 | 동작 |
|------|------|
| 1 | 새 이미지 빌드 (기존 컨테이너는 계속 동작) |
| 2 | 기존 backend 컨테이너 중지 → **이 순간부터 502 등 발생** |
| 3 | 새 backend 컨테이너 기동 |
| 4 | 정상 응답 재개 |

**결정**: 본 서비스는 긴급성이 높지 않아 **현 상태 유지**.  
무중단 배포는 버전 업그레이드 시 검토 (→ [무중단 배포 검토](./02b_zero_downtime_deployment.md))
