# 배포 문서

> Yak-Sok 서비스 AWS 배포 및 App Store 제출 가이드

## 🎉 App Store 심사 제출 완료! (2026-01-26)

## 📚 문서 목록

### 서버 배포
| 문서 | 설명 |
|------|------|
| [01_aws_lightsail_setup.md](./01_aws_lightsail_setup.md) | 서버 설정 및 배포 명령어 |
| [02_cicd_pipeline.md](./02_cicd_pipeline.md) | GitHub Actions 자동 배포 |
| [03_monitoring_setup.md](./03_monitoring_setup.md) | Sentry 에러 트래킹 |
| [04_deployment_status.md](./04_deployment_status.md) | 📊 배포 진행 현황 |

### App Store 제출
| 문서 | 설명 |
|------|------|
| [05_appstore_metadata.md](./05_appstore_metadata.md) | 앱스토어 메타데이터 템플릿 |
| [06_appstore_submission_guide.md](./06_appstore_submission_guide.md) | 앱스토어 제출 상세 가이드 |
| [07_appstore_progress.md](./07_appstore_progress.md) | ⭐ **제출 완료!** 진행 상황 |

### 트러블슈팅
| 문서 | 설명 |
|------|------|
| [08_terms_privacy_troubleshooting.md](./08_terms_privacy_troubleshooting.md) | 이용약관/개인정보 처리방침 문제 해결 |
| [09_testflight_login_troubleshooting.md](./09_testflight_login_troubleshooting.md) | ⭐ TestFlight 로그인 실패 해결 |


---

## 🚀 Quick Start

### API URL
```
https://yaksok-care.com/api/
```

### SSH 접속
```bash
# 실제 정보는 docs/SENSITIVE_INFO.md 참고
ssh -i <SSH 키 경로> ubuntu@<서버 IP>
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
