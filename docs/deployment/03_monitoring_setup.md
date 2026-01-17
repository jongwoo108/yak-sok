# 모니터링 설정

> 업데이트: 2026-01-18

## 📋 현재 설정된 모니터링

| 서비스 | 용도 | 상태 |
|--------|------|------|
| Sentry | 에러 트래킹 | ✅ 활성화 |
| CloudWatch | 서버 메트릭 | ✅ 기본 |

---

## 🐛 Sentry (에러 트래킹)

### 설정 정보
- 프로젝트: `yaksok-backend`
- DSN: `.env`의 `SENTRY_DSN`에 저장

### Django 설정
`backend/core/settings.py`:
```python
import sentry_sdk

SENTRY_DSN = os.environ.get('SENTRY_DSN', '')
if SENTRY_DSN and not os.environ.get('DJANGO_DEBUG', 'True') == 'True':
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        environment="production",
    )
```

### 대시보드
[https://sentry.io](https://sentry.io) → yaksok-backend 프로젝트

---

## 📊 CloudWatch (서버 메트릭)

Lightsail 기본 제공 메트릭:
- CPU 사용률
- 네트워크 I/O
- 디스크 사용량

---

## 🔔 알림 설정 (선택)

### UptimeRobot (가용성 모니터링)
1. [uptimerobot.com](https://uptimerobot.com) 가입
2. Monitor 추가: `https://yaksok-care.com/api/`
3. 다운 시 이메일 알림

### Sentry 알림
- Sentry → Settings → Alerts → 이메일 알림 설정
