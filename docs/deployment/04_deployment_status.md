# 배포 진행 현황

> 최종 업데이트: 2026-01-18

## 📊 배포 상태 요약

| 구성 요소 | 상태 | 비고 |
|-----------|:----:|------|
| 백엔드 (Django) | ✅ 완료 | gunicorn + Docker |
| PostgreSQL DB | ✅ 완료 | Docker 컨테이너 |
| Redis | ✅ 완료 | Celery 브로커 |
| Celery Worker | ✅ 완료 | 비동기 작업 처리 |
| Celery Beat | ✅ 완료 | 스케줄링 |
| Nginx + SSL | ✅ 완료 | Let's Encrypt |
| 도메인 | ✅ 완료 | yaksok-care.com |
| 모바일 (Android) | ✅ 완료 | EAS Build |
| 모바일 (iOS) | ⏳ 대기 | Apple Developer 승인 대기 |
| 푸시 알림 | ⏳ 테스트 필요 | FCM 토큰 코드 수정 완료 |

---

## 🌐 서비스 URL

- **API**: https://yaksok-care.com/api/
- **서버 IP**: 3.39.142.149
- **SSH 접속**: 
  ```bash
  ssh -i ~/.ssh/LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.142.149
  ```

---

## 📱 모바일 빌드

### Android
- **상태**: ✅ 빌드 완료
- **빌드 URL**: https://expo.dev/accounts/jongwoo108/projects/yak-sok/builds
- **프로필**: preview

### iOS
- **상태**: ⏳ Apple Developer 계정 활성화 대기
- **예상 시간**: 최대 48시간
- **빌드 명령어** (활성화 후):
  ```bash
  npx eas build --platform ios --profile preview
  ```

---

## ✅ 오늘 완료한 작업 (2026-01-18)

### 1. 서버 설정
- Nginx `client_max_body_size` 20MB로 증가 (OCR 이미지 업로드용)
- Nginx 프록시 타임아웃 120초로 설정

### 2. Docker 서비스 실행
- 모든 서비스 정상 실행 확인
  - `yaksok-db`, `yaksok-redis`, `yaksok-backend`
  - `yaksok-celery-worker`, `yaksok-celery-beat`
  - `yaksok-certbot`

### 3. 모바일 앱 수정
- 로그인 화면에서 데모 모드 버튼 제거
- FCM 토큰 발급 방식 변경 (Expo Push Token → 네이티브 FCM 토큰)

### 4. 문서화
- 배포 진행 현황 문서 작성

---

## ⏳ 남은 작업

1. **iOS 빌드 및 테스트**
   - Apple Developer 계정 활성화 대기
   - 활성화 후 EAS Build 실행

2. **푸시 알림 테스트**
   - 네이티브 FCM 토큰 발급 확인
   - 실제 기기에서 푸시 알림 수신 테스트

3. **TestFlight 배포** (선택)
   - iOS 앱 베타 테스트 배포

---

## 🔧 서버 운영 명령어

### 배포
```bash
cd /app/yak-sok
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build backend
```

### 전체 재시작
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### 로그 확인
```bash
# 백엔드 로그
docker logs yaksok-backend --tail 50

# Celery 워커 로그
docker logs yaksok-celery-worker --tail 50

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
```

### DB 접속
```bash
docker exec -it yaksok-db psql -U yaksok_user -d yaksok_db
```
