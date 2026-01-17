# 배포 문서

> Yak-Sok 서비스 AWS 배포 가이드

## 📚 문서 목록

| 문서 | 설명 |
|------|------|
| [01_aws_lightsail_setup.md](./01_aws_lightsail_setup.md) | 서버 설정 및 배포 명령어 |
| [02_cicd_pipeline.md](./02_cicd_pipeline.md) | GitHub Actions 자동 배포 |
| [03_monitoring_setup.md](./03_monitoring_setup.md) | Sentry 에러 트래킹 |

---

## 🚀 Quick Start

### API URL
```
https://yaksok-care.com/api/
```

### SSH 접속
```bash
ssh -i ~/.ssh/LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.142.149
```

### 수동 배포
```bash
cd /app/yak-sok
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build backend
```

---

## 💰 월 비용

| 항목 | 비용 |
|------|------|
| Lightsail (2GB) | $12 |
| Route 53 | $0.50 |
| 도메인 | ~$1 |
| **합계** | **~$14/월** |
