# 모니터링 설정 가이드

> 작성일: 2026-01-18

## 📋 개요

비용효율적인 모니터링 스택 구성 가이드입니다.

---

## 🏗️ 모니터링 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                  모니터링 스택                        │
├─────────────────────────────────────────────────────┤
│  CloudWatch        → 기본 메트릭 + 알람              │
│  Sentry            → 에러 트래킹                     │
│  UptimeRobot       → 가용성 모니터링                 │
│  (선택) Grafana    → 고급 대시보드                   │
└─────────────────────────────────────────────────────┘
```

---

## 1️⃣ CloudWatch (기본)

### 자동 수집 메트릭
Lightsail은 기본적으로 다음을 수집:
- CPU 사용률
- 네트워크 I/O
- 디스크 사용량
- 인스턴스 상태

### 알람 설정

AWS Console → CloudWatch → Alarms → Create alarm

| 알람 이름 | 메트릭 | 조건 |
|----------|--------|------|
| yaksok-cpu-high | CPUUtilization | > 80% (5분) |
| yaksok-memory-high | MemoryUtilization | > 85% |
| yaksok-disk-high | DiskUtilization | > 80% |

### SNS 알림 설정

```bash
# SNS 토픽 생성 (AWS CLI)
aws sns create-topic --name yaksok-alerts

# 이메일 구독 추가
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-northeast-2:xxx:yaksok-alerts \
  --protocol email \
  --notification-endpoint your@email.com
```

---

## 2️⃣ Sentry (에러 트래킹)

### 설정

1. [sentry.io](https://sentry.io) 가입 (무료)
2. 프로젝트 생성 (Django 선택)
3. DSN 복사

### Django 연동

```python
# backend/requirements.txt
sentry-sdk

# backend/core/settings.py
import sentry_sdk

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=0.1,
    environment="production"
)
```

### 환경 변수 추가

```env
# .env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## 3️⃣ UptimeRobot (가용성)

### 설정

1. [uptimerobot.com](https://uptimerobot.com) 가입 (무료)
2. **Add New Monitor** 클릭
3. 설정:
   - Monitor Type: HTTP(s)
   - URL: `https://your-domain.com/api/`
   - Monitoring Interval: 5 minutes

### 알림 설정
- Email 알림 활성화
- (선택) Slack Webhook 연동

---

## 4️⃣ Grafana + Prometheus (선택)

고급 모니터링이 필요한 경우 Docker Compose에 추가:

### docker-compose.monitoring.yml

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: yaksok-prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - yaksok-network

  grafana:
    image: grafana/grafana:latest
    container_name: yaksok-grafana
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    networks:
      - yaksok-network

  node-exporter:
    image: prom/node-exporter:latest
    container_name: yaksok-node-exporter
    networks:
      - yaksok-network

volumes:
  prometheus_data:
  grafana_data:
```

### prometheus/prometheus.yml

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

---

## 💰 비용 요약

| 서비스 | 플랜 | 비용/월 |
|--------|------|---------|
| CloudWatch | 무료 티어 | $0 |
| CloudWatch Alarms | 5개 | $0.50 |
| Sentry | 무료 | $0 |
| UptimeRobot | 무료 | $0 |
| **합계** | | **$0.50** |

---

## ✅ 설정 체크리스트

- [ ] CloudWatch 메트릭 확인
- [ ] CloudWatch 알람 생성 (CPU, 메모리, 디스크)
- [ ] SNS 이메일 알림 설정
- [ ] Sentry 프로젝트 생성 및 Django 연동
- [ ] UptimeRobot 모니터 추가
