# 📋 개발 진행 현황

> 최종 업데이트: 2026-03-30

## 진행 상태 요약

| 단계 | 상태 | 완료일 |
|------|------|--------|
| 1. 프로젝트 설계 | ✅ 완료 | 2026-01-09 |
| 2. 백엔드 구조 구축 | ✅ 완료 | 2026-01-09 |
| 3. 프론트엔드 구조 구축 | ✅ 완료 | 2026-01-09 |
| 4. 인프라 설정 | ✅ 완료 | 2026-01-09 |
| 5. 개발 환경 로컬 테스트 | ✅ 완료 | 2026-01-09 |
| 6. UI/UX 디자인 시스템 | ✅ 완료 | 2026-01-09 |
| 7. API 연동 및 테스트 | ✅ 완료 | 2026-01-11 |
| 8. OCR/STT 기능 구현 | ✅ 완료 | 2026-01-11 |
| 9. 푸시 알림 연동 | ✅ 완료 | 2026-01-11 |
| 10. 복약 캘린더 기능 | ✅ 완료 | 2026-01-17 |
| 11. 사용자 간 알림 전송 | ✅ 완료 | 2026-01-17 |
| 12. 역할 구조 개편 | ✅ 완료 | 2026-01-17 |
| 13. iOS SDK 53 업그레이드 | ✅ 완료 | 2026-01-25 |
| 14. TestFlight 테스트 | ✅ 완료 | 2026-01-26 |
| 15. **App Store 심사 제출** | ✅ 완료 | 2026-01-26 |
| 16. App Store 심사 통과 | ✅ 완료 | 2026-02-02 |
| 17. 푸시 알림 UX 개선 | ✅ 완료 | 2026-02-02 |
| 18. 스플래시 이미지 업데이트 | ✅ 완료 | 2026-02-07 |
| 19. 건강 유튜브 피드 기능 | ✅ 구현 완료 (배포 전) | 2026-02-07 |
| 20. 건강 피드 v1.1.0 보완 | ✅ 완료 | 2026-02-07 |
| 21. v1.1.6 역할 통합 & 피드 자동 업데이트 | ✅ 완료 | 2026-02-23 |
| 22. v1.1.7 스캔 UI 통일 & 서버 배포 | ✅ 완료 | 2026-03-20 |
| 23. **Android 빌드** | ✅ 빌드 성공 (Play Store 미제출) | 2026-03-30 |

---

## 🎨 UI/UX 디자인 시스템 완료 (2026-01-09)

### 적용된 디자인 특징

- **파스텔 뉴모피즘**: 부드러운 그림자와 파스텔 톤 색상
- **동적 레이아웃**: `clamp()` 기반 반응형 여백
- **시니어 친화적**: 큰 폰트(17.6px+)와 넓은 터치 영역(52px+)
- **유기적 배경**: 그라데이션 배경 효과

### 업데이트된 페이지

| 페이지 | 상태 |
|--------|------|
| 홈 | ✅ |
| 로그인 | ✅ |
| 약 목록 | ✅ |
| 약 추가 | ✅ |
| 처방전 스캔 | ✅ |
| 프로필 | ✅ |
| 알림 | ✅ |
| 보호자 대시보드 | ✅ |
| **복약 캘린더** | ✅ NEW |

---

## 📅 복약 캘린더 기능 (2026-01-17)

### 주요 기능

- **월별 복약 현황 시각화**: 캘린더에 복약 완료/일부/미복용 상태 표시
- **병원 방문일 자동 계산**: 처방 일수 기반으로 약 떨어지는 날 표시
- **일괄 수정 기능**: 같은 날짜의 여러 약을 한 번에 수정

### 캘린더 마커 색상

| 색상 | 의미 |
|------|------|
| 🟢 초록 | 복약 완료 |
| 🟡 노랑 | 일부 복용 |
| 🔴 빨강 | 미복용 |
| 🔵 파랑 | 병원 방문일 |

### 관련 파일

- `mobile/app/(tabs)/calendar.tsx` - 캘린더 화면
- `backend/apps/medications/models.py` - `days_supply`, `start_date` 필드
- `backend/apps/medications/views.py` - 캘린더 API

---

## 💬 사용자 간 알림 전송 기능 (2026-01-17)

### 주요 기능

- **보호자 → 복약자/시니어**: 안부 확인, 약 드셨나요?
- **복약자/시니어 → 보호자**: 괜찮아요, 도움 필요해요
- **연결된 사용자 확인**: GuardianRelation 기반 권한 검증

### API 엔드포인트

```
POST /api/alerts/send/
{
    "recipient_id": 1,
    "message_type": "check_in" | "reminder" | "im_ok" | "need_help" | "custom",
    "custom_message": "직접 입력 메시지 (optional)"
}
```

### 관련 파일

- `backend/apps/alerts/views.py` - 알림 전송 API
- `backend/apps/alerts/serializers.py` - SendAlertSerializer
- `mobile/app/(tabs)/profile.tsx` - 알림 전송 UI

---

## 👥 역할 구조 개편 (2026-01-17)

### 3가지 사용자 역할

| 역할 | 설명 | 탭 구성 |
|------|------|---------|
| **복약자** | 자신의 약만 관리 | 건강피드, 복약, 캘린더, 설정 (4탭) |
| **시니어** | 약 관리 + 보호자 연결 | 건강피드, 복약, 캘린더, 설정 (4탭) |
| **보호자** | 연결된 사용자 모니터링 | 시니어관리, 시니어캘린더, 설정 (3탭) |

### 연결 규칙

- 복약자/시니어 ↔ 보호자 연결 가능
- 같은 역할끼리는 연결 불가

### 보호자 전용 화면

- **시니어 관리**: 연결된 복약자/시니어의 오늘 복약 현황
- **시니어 캘린더**: 연결된 복약자/시니어의 월별 복약 기록

### 관련 파일

- `backend/apps/users/models.py` - User.Role 정의
- `mobile/app/(auth)/register.tsx` - 3개 역할 선택 UI
- `mobile/components/CustomTabBar.tsx` - 역할별 탭 필터링
- `mobile/app/(tabs)/seniors.tsx` - 시니어 관리 화면
- `mobile/app/(tabs)/senior-calendar.tsx` - 시니어 캘린더 화면

---

## 🖥️ 개발 환경 설정 완료 (2026-01-09)

### 로컬 서버 실행 현황

| 서비스 | URL | 상태 |
|--------|-----|------|
| **프론트엔드 (Next.js)** | `http://localhost:3000` | ✅ 정상 |
| **백엔드 (Django)** | `http://127.0.0.1:8000` | ✅ 정상 |
| **Django Admin** | `http://127.0.0.1:8000/admin/` | ✅ 접속 가능 |
| **PostgreSQL** | `localhost:5432` / DB: `yaksok` | ✅ 연결됨 |

### 로컬 실행 명령어

```bash
# 프론트엔드 (새 터미널)
cd frontend
npm run dev

# 백엔드 (새 터미널)
cd backend
python manage.py runserver
```

---

## 문서 목록

### 개발 문서
- [01_project_structure.md](./development/01_project_structure.md) - 프로젝트 구조 및 아키텍처
- [02_backend_development.md](./development/02_backend_development.md) - 백엔드 개발 상세
- [03_frontend_development.md](./development/03_frontend_development.md) - 프론트엔드 개발 상세
- [04_api_specification.md](./development/04_api_specification.md) - API 명세
- [05_react_native_implementation.md](./development/05_react_native_implementation.md) - React Native 앱 구현
- [06_ui_design_system.md](./development/06_ui_design_system.md) - UI/UX 디자인 시스템
- [08_calendar_feature.md](./development/08_calendar_feature.md) - 복약 캘린더 기능
- [09_notification_system.md](./development/09_notification_system.md) - 사용자 연결 및 알림 시스템
- [10_role_structure.md](./development/10_role_structure.md) - 역할 구조

### iOS 빌드 문제 해결
- [11_ios_crash_resolution.md](./development/11_ios_crash_resolution.md) - iOS 크래시 해결 (SDK 51)
- [12_ios_functional_issue_resolution.md](./development/12_ios_functional_issue_resolution.md) - iOS 기능 오류 해결
- [13_ios_sdk53_troubleshooting.md](./development/13_ios_sdk53_troubleshooting.md) - iOS SDK 53 트러블슈팅
- [14_ios_sdk53_resolution.md](./development/14_ios_sdk53_resolution.md) - **iOS SDK 53 문제 해결** ✅ 완료 (2026-01-25)
- [15_notification_improvement.md](./development/15_notification_improvement.md) - **푸시 알림 UX 개선** ✅ 완료 (2026-02-05 업데이트)
- [16_health_newsfeed_plan.md](./development/16_health_newsfeed_plan.md) - **건강 유튜브 피드 기능** ✅ 구현 완료 (2026-02-07)
- [18_health_feed_v1.1.0_changelog.md](./development/18_health_feed_v1.1.0_changelog.md) - **건강 피드 v1.1.0 작업 정리** (레이아웃, 스플래시, 버그 수정, 백엔드) ✅ 2026-02-07
- [17_sql_practice_queries.md](./development/17_sql_practice_queries.md) - **SQL 실습 예제** (pgAdmin / 프로젝트 DB)
- [21_v1.1.6_changelog.md](./development/21_v1.1.6_changelog.md) - **v1.1.6 역할 통합 & 피드 자동 업데이트**
- [version_1_1_7_update.md](./development/version_1_1_7_update.md) - **v1.1.7 스캔 UI 통일 & 서버 배포**
- [22_android_build.md](./development/22_android_build.md) - **Android 빌드** ✅ (2026-03-30)

### 배포 문서
- [deployment/README.md](./deployment/README.md) - 배포 가이드 전체
- [deployment/01_aws_lightsail_setup.md](./deployment/01_aws_lightsail_setup.md) - AWS Lightsail 설정
- [deployment/02_cicd_pipeline.md](./deployment/02_cicd_pipeline.md) - CI/CD (GitHub Actions)
- [deployment/02b_zero_downtime_deployment.md](./deployment/02b_zero_downtime_deployment.md) - 무중단 배포 검토 (참고용)
- [deployment/03_monitoring_setup.md](./deployment/03_monitoring_setup.md) - 모니터링 (Sentry)
- [deployment/04_deployment_status.md](./deployment/04_deployment_status.md) - 배포 진행 현황
- [deployment/05_appstore_metadata.md](./deployment/05_appstore_metadata.md) - **앱스토어 메타데이터** 📱 (2026-01-25)
- [deployment/06_appstore_submission_guide.md](./deployment/06_appstore_submission_guide.md) - **앱스토어 제출 가이드** 📋 (2026-01-25)
- [deployment/07_appstore_progress.md](./deployment/07_appstore_progress.md) - **앱스토어 제출 진행 상황** ⭐ NEW (2026-01-25)

---

## ✅ 해결된 이슈 (2026-01-25)

### iOS SDK 53 업그레이드 완료
- **크래시 문제**: React Navigation v7 정렬 + 엔트리 포인트 통일로 해결
- **로그아웃 문제**: 토큰 갱신 로직 개선 + 직접 라우팅으로 해결
- **회원가입 후 에러**: store 초기화 함수 추가로 해결
- **EAS 계정 변경**: `jongwoo1008` 계정으로 전환 완료

**상세 내용**: [14_ios_sdk53_resolution.md](./development/14_ios_sdk53_resolution.md)

---

## 🎉 App Store 심사 제출 완료 (2026-01-26)

### ✅ 완료된 작업
- [x] 이용약관 및 개인정보 처리방침 작성
- [x] 법적 문서 웹 호스팅 (yaksok-care.com)
- [x] 앱 내 링크 연결
- [x] 앱스토어 메타데이터 준비
- [x] 서버 배포 및 TestFlight 테스트
- [x] TestFlight 로그인 문제 해결
- [x] Production 빌드 실행
- [x] App Store Connect 메타데이터 입력
- [x] **App Store 심사 제출 완료!**

**진행 상황**: [07_appstore_progress.md](./deployment/07_appstore_progress.md)
**트러블슈팅**: [09_testflight_login_troubleshooting.md](./deployment/09_testflight_login_troubleshooting.md)

---

## 건강 피드 v1.1.0 보완 (2026-02-07)

- **피드**: 2열 → 1열 레이아웃, 무한 스크롤 유지, 제목/채널명 이모지 제거
- **스플래시**: 권장 이미지 1284x2778px, `expo-splash-screen`으로 인증 완료 시점까지 표시
- **영상 상세**: 로드 실패 시 에러 메시지 + 재시도 버튼
- **설정**: 연결관리에서 복약자 계정일 때 본인 대신 연결된 보호자만 표시 (버그 수정)
- **백엔드**: Health API URL 라우팅 추가, GPT-5 사용 및 temperature 제거, 키워드 생성 프롬프트 JSON 명시

상세: [18_health_feed_v1.1.0_changelog.md](./development/18_health_feed_v1.1.0_changelog.md)

---

## 다음 단계

### Android Play Store 출시 준비
1. **Google Play Console 가입** (개발자 등록비 $25)
2. **서비스 계정 JSON 생성** → `mobile/google-service-account.json`
3. **카카오 Android 키 해시 등록** (카카오 개발자 콘솔)
4. **Google Android Client ID 발급** (Google Cloud Console)
5. **Play Store 제출**: `npx eas-cli submit --platform android`

### 향후 계획
1. **사용자 피드백 수집**: 앱 개선사항 파악
2. **콘텐츠 품질 관리**: 신뢰 채널 목록 확장, 부적절 영상 필터링
3. **테스트 코드 작성**: 유닛/통합 테스트
4. **성능 최적화**: API 응답 속도 개선

