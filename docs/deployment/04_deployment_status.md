# 배포 진행 현황

> 최종 업데이트: 2026-01-20

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
| 모바일 (iOS) | ⚠️ 크래시 이슈 | TurboModules 충돌 조사 중 |
| 푸시 알림 | ⏳ iOS 빌드 후 테스트 | Expo Go에서는 작동 안 함 |
| App Store Connect | ✅ 앱 등록 완료 | 약-속 (com.jongwoo.yaksok) |

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
- **상태**: ⚠️ 앱 크래시 이슈 조사 중
- **빌드 URL**: https://expo.dev/accounts/jongwoo108/projects/yak-sok/builds
- **프로필**: preview
- **Bundle ID**: com.jongwoo.yaksok
- **App Store Connect**: 앱 등록 완료 (약-속)
- **빌드 명령어**:
  ```bash
  npx eas build --platform ios --profile preview --clear-cache
  ```

#### 🐛 알려진 이슈
- 앱 실행 시 즉시 크래시 발생
- 원인: TurboModules에서 `ObjCTurboModule::performVoidMethodInvocation` 충돌
- 크래시 로그: `SIGABRT` (Abort trap: 6)
- 시도한 해결 방법:
  1. `newArchEnabled: false` 설정 → 효과 없음
  2. `notification.ts` try-catch 적용 → 효과 없음
  3. `_layout.tsx` 알림 초기화 방어 코드 추가 → 효과 없음

---

## ✅ 작업 이력

### 2026-01-20

#### 1. Apple Developer 계정 설정
- Apple Developer Program 결제 완료 및 계정 활성화
- App Store Connect에서 앱 등록 (약-속)
- Bundle ID 등록: `com.jongwoo.yaksok`
- Push Notifications capability 활성화

#### 2. iOS 빌드 시도
- EAS Build로 iOS preview 빌드 여러 차례 시도
- Apple Distribution Certificate 생성
- Provisioning Profile 생성 (Ad Hoc)
- Push Key 생성 및 연결

#### 3. iOS 크래시 디버깅
- 크래시 로그 분석: TurboModules 관련 충돌 확인
- `newArchEnabled: false` 설정
- `ITSAppUsesNonExemptEncryption: false` 추가
- `notification.ts` try-catch 적용
- `_layout.tsx` 알림 초기화 방어 코드 추가

#### 4. 모바일 UI 개선
- 로그인 페이지 키보드 dismiss 기능 추가
- 이메일 입력 placeholder 자간 수정
- 앱 이름 폰트 크기 조정

### 2026-01-18

#### 1. 서버 설정
- Nginx `client_max_body_size` 20MB로 증가 (OCR 이미지 업로드용)
- Nginx 프록시 타임아웃 120초로 설정

#### 2. Docker 서비스 실행
- 모든 서비스 정상 실행 확인
  - `yaksok-db`, `yaksok-redis`, `yaksok-backend`
  - `yaksok-celery-worker`, `yaksok-celery-beat`
  - `yaksok-certbot`

#### 3. 모바일 앱 수정
- 로그인 화면에서 데모 모드 버튼 제거
- FCM 토큰 발급 방식 변경 (Expo Push Token → 네이티브 FCM 토큰)

---

## ⏳ 남은 작업

1. **iOS 크래시 해결** (우선순위 높음)
   - TurboModules 충돌 원인 추가 조사
   - expo-notifications iOS 호환성 확인
   - 필요시 development 빌드로 상세 디버깅

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
