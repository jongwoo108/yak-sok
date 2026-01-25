# iOS SDK 53 문제 해결 기록 (2026-01-22 ~ 2026-01-25)

> Dev Client 기반 디버깅 및 크래시 해결 과정 정리

## 요약

SDK 53 환경에서 iOS 앱 실행 시 크래시/네비게이션 오류가 지속적으로 발생했으나, 아래 조치들을 통해 정상 실행 및 카메라 기능 동작까지 확인했습니다.

- 핵심 원인: 네비게이션 패키지 버전 불일치 + 라우터 엔트리 혼선 + iOS 권한(Info.plist) 누락
- 해결 결과: 앱 정상 실행, 회원가입/로그인 정상, 알림 토큰 업데이트 정상, 카메라 기능 정상, 로그아웃 정상

---

## 해결 과정 타임라인

### 1) Dev Client 실행 이슈 (expo-crypto 누락)
**증상**
- `Error: Cannot find native module 'ExpoCrypto'`

**조치**
- `expo-crypto` 설치

**결과**
- Dev Client 부팅 가능

---

### 2) 네비게이션 컨테이너 오류
**증상**
- `Couldn't find a navigation object. Is your component inside NavigationContainer?`
- `getState of undefined`

**원인**
- `expo-router`가 내부적으로 React Navigation v7을 기대하지만 프로젝트는 v6 사용 중
- 엔트리 포인트(App/index) 설정이 일관되지 않아 라우터 컨테이너 초기화 실패

**조치**
- React Navigation 패키지를 v7로 정렬
  - `@react-navigation/native` → `^7.1.28`
  - `@react-navigation/native-stack` → `^7.10.1`
  - `@react-navigation/bottom-tabs` → `^7.10.1`
- 엔트리 포인트를 `index.ts` → `expo-router/entry`로 통일
  - `package.json`: `"main": "index"`
  - `index.ts`: `import 'expo-router/entry';`
- babel 플러그인 경고 대응
  - `expo-router/babel` 제거 (SDK 53에서 불필요)

**결과**
- `NavigationContainer` 관련 오류 해결
- 앱 정상 부팅

---

### 3) 알림 초기화 안정화
**증상**
- 초기 실행 직후 크래시 가능성

**조치**
- 알림 초기화를 지연 호출 방식으로 변경
- Expo Push Token `projectId`를 EAS 설정에서 자동 추출

**결과**
- 토큰 업데이트 정상 동작

---

### 4) 회원가입 400 오류 개선
**증상**
- `username already exists` (400)

**조치**
- Backend: `username=email` 정책에 맞게 username 중복도 email 중복으로 처리
- Mobile: `username` 에러 메시지 표시 추가

**결과**
- 사용자에게 명확한 오류 메시지 제공

---

### 5) 카메라 실행 시 앱 종료
**증상**
- 카메라/갤러리 접근 시 iOS 앱 종료

**원인**
- iOS 권한 Info.plist 문구 누락

**조치**
- `app.config.js`에 권한 문구 추가
  - `NSCameraUsageDescription`
  - `NSPhotoLibraryUsageDescription`
  - `NSPhotoLibraryAddUsageDescription`

**결과**
- 카메라/앨범 기능 정상 동작

---

### 6) 로그아웃 후 토큰 갱신 에러 (2026-01-25)
**증상**
- 로그아웃 시 `[API] 토큰 갱신 실패: [Error: No refresh token]` 에러 로그 출력
- 캘린더 등에서 401 에러 발생

**원인**
- 로그아웃 시 토큰이 먼저 삭제되지만, 화면 전환 중 API 호출이 발생
- API 인터셉터가 refresh token으로 갱신 시도 → 토큰이 없어서 에러

**조치**
- `api.ts`: 로그아웃 플래그(`isLoggingOut`) 추가
- `api.ts`: 토큰 없을 때 조용히 reject (에러 로그 제거)
- `store.ts`: 로그아웃 시 `setLoggingOut(true)` 호출
- `calendar.tsx`: API 호출 전 `isAuthenticated` 체크 추가

**결과**
- 로그아웃 시 불필요한 에러 로그 제거
- 정상적으로 로그인 화면으로 이동

---

### 7) 로그아웃 후 로그인 페이지 이동 실패 (2026-01-25)
**증상**
- 로그아웃 후 로그인 페이지가 아닌 메인 페이지가 표시됨

**원인**
- `router.replace('/')` 호출 시 `index.tsx`가 렌더링되지만
- Zustand 상태 업데이트 타이밍으로 `isAuthenticated`가 아직 true

**조치**
- `profile.tsx`: `router.replace('/(auth)/login')` 으로 직접 이동

**결과**
- 로그아웃 후 즉시 로그인 페이지로 이동

---

### 8) 회원가입 후 메인 페이지 400 에러 (2026-01-25)
**증상**
- 새 계정으로 회원가입 후 메인 페이지에서 `[AxiosError: Request failed with status code 400]`
- 로그아웃 후 다시 로그인하면 에러 없음

**원인**
- 이전 사용자의 캐시된 데이터(medications, todayLogs, alerts)가 초기화되지 않음
- 새 사용자로 로그인 시 이전 데이터로 API 호출 시도

**조치**
- `store.ts`: `resetStore()` 함수 추가 (medications, todayLogs, alerts 초기화)
- `login.tsx`: 로그인 성공 시 `resetStore()` 호출
- `register.tsx`: 회원가입 성공 시 `resetStore()` 호출

**결과**
- 새 계정 로그인/회원가입 시 이전 데이터 초기화
- 400 에러 해결

---

### 9) Expo 계정 변경 (2026-01-25)
**배경**
- 기존 EAS 프로젝트가 다른 계정(`jongwoo3353`)에 연결되어 빌드 불가
- `Entity not authorized` 에러 발생

**조치**
- `app.config.js`: `owner`를 `jongwoo1008`로 변경
- `app.config.js`: 기존 `projectId` 제거 후 `eas init`으로 새 ID 발급
- 새 projectId: `dc59cea5-ac4a-4706-89e4-fcda750a2bc4`

**결과**
- `jongwoo1008` 계정으로 EAS 빌드 정상 동작

---

## 적용된 변경 요약

### Mobile
- `package.json`
  - React Navigation v7 정렬
  - `main` 엔트리 변경
- `index.ts`
  - `expo-router/entry`로 통일
- `App.tsx`
  - 엔트리 라우팅 간소화
- `babel.config.js`
  - `expo-router/babel` 제거
- `services/notification.ts`
  - 알림 초기화 지연 방식
- `app/_layout.tsx`
  - 라우팅 컨테이너 준비 후 이동 로직으로 변경 (최종적으로 단순화 후 안정 확인)
- `app.config.js`
  - iOS 권한 문구 추가
  - `owner`: `jongwoo1008`
  - `projectId`: `dc59cea5-ac4a-4706-89e4-fcda750a2bc4`
- `services/api.ts` (2026-01-25)
  - `isLoggingOut` 플래그 추가
  - 토큰 갱신 실패 시 조용히 처리
- `services/store.ts` (2026-01-25)
  - `resetStore()` 함수 추가
  - `logout()` 시 로그아웃 플래그 설정
- `app/(tabs)/profile.tsx` (2026-01-25)
  - 로그아웃 시 `/(auth)/login`으로 직접 이동
- `app/(tabs)/calendar.tsx` (2026-01-25)
  - `isAuthenticated` 체크 후 API 호출
- `app/(auth)/login.tsx` (2026-01-25)
  - 로그인 시 `resetStore()` 호출
- `app/(auth)/register.tsx` (2026-01-25)
  - 회원가입 시 `resetStore()` 호출

### Backend
- `apps/users/serializers.py`
  - `email`/`username` 중복 처리 통합

---

## 최종 상태 (2026-01-25 업데이트)

- iOS 앱 정상 실행 (SDK 53)
- Dev Client에서 정상 로딩
- 회원가입/로그인 정상
- 알림 토큰 업데이트 정상
- 카메라 기능 정상
- **로그아웃 정상 동작** ✅
- **계정 전환 시 데이터 초기화** ✅
- **EAS 빌드 정상 (jongwoo1008 계정)** ✅

---

## 향후 권장 사항

1. **SDK 54 재도전 전 체크리스트**
   - React Navigation 버전 맞춤
   - 엔트리 포인트 일관성 유지
   - iOS 권한 문구 누락 확인

2. **Dev Client 빌드 후 테스트 루틴**
   - `npx expo start --dev-client -c`
   - 카메라, 알림, 로그인 순서대로 기능 검증

---

## 실패/이슈 사례 기록

### A) TestFlight 로그아웃 시 앱 종료 (SIGABRT) ✅ 해결됨
**증상**
- 설정 탭에서 로그아웃 시 앱 즉시 종료
- iOS 분석 로그에서 `ExceptionsManagerQueue` abort 확인

**원인**
- 로그아웃 시 토큰 삭제 후에도 API 인터셉터가 토큰 갱신 시도
- `router.replace('/')` 호출 시 isAuthenticated 상태 업데이트 타이밍 문제

**해결 (2026-01-25)**
1. `api.ts`에 로그아웃 플래그 추가 (`isLoggingOut`)
2. 토큰 갱신 실패 시 에러 로그 조용히 처리
3. `profile.tsx`에서 직접 `router.replace('/(auth)/login')` 호출
4. `calendar.tsx`에서 `isAuthenticated` 체크 후 API 호출

**상태**
- ✅ 해결 완료

---

### B) TestFlight 빌드 업로드 중복 오류
**증상**
- `You've already submitted this build of the app`

**원인**
- `CFBundleVersion`(= `expo.ios.buildNumber`) 중복

**해결**
- `app.config.js`의 `ios.buildNumber` 증가 후 재빌드/재제출

---

### C) EAS Build 월간 할당량 소진
**증상**
- Free 플랜 iOS 빌드 한도 소진으로 빌드 실패

**대응**
- 빌드 대기(월 초기화) 또는 플랜 업그레이드 필요

---

### D) App Store Connect 경고 (SDK 버전)
**증상**
- `ITMS-90725: SDK version issue`

**의미**
- iOS 26 SDK 이상(Xcode 26) 필요 예정

**대응**
- EAS/Xcode 환경 업데이트 후 재빌드 계획 수립 필요

---

### E) EAS Build 플러그인 해석 오류
**증상**
- `Failed to resolve plugin for module "expo-web-browser" relative to "C:\yak-sok"`

**원인 추정**
- 모바일 폴더가 아닌 루트에서 빌드 명령 실행

**해결**
- `cd mobile`에서 `eas build` 실행

---

## TestFlight에서만 꺼지는 이유 (요약)

1) **릴리스 빌드 동작 차이**
   - Dev Client에서는 에러가 화면에 표시되지만 TestFlight(릴리스)에서는 JS 예외가 즉시 종료로 이어짐.

2) **환경변수/설정 차이**
   - `.env`는 TestFlight에 전달되지 않음 → EAS production 환경변수로 주입 필요.
   - 누락 시 인증/로그인 모듈에서 크래시 발생 가능.

3) **네비게이션 초기화 타이밍**
   - 릴리스 환경에서 더 빠른 초기화로 인해 `router.replace` 타이밍이 앞당겨져 충돌 가능.

4) **로그 접근성 차이**
   - Dev Client는 Metro 로그로 확인 가능하지만 TestFlight는 iOS 분석 로그/Crash 탭 의존.

---

## 반복 빌드 최소화 전략

1) **원인 분리 빌드**
   - 의심 모듈(로그인/알림/캘린더 등)을 단계적으로 비활성화하여 원인 좁히기.

2) **릴리스 환경 변수 고정**
   - EAS production 환경에 `SENTRY_DSN`, `GOOGLE_*`, `API_BASE_URL` 등 필수 변수 등록.

3) **Sentry/크래시 로깅 확인**
   - TestFlight에서만 재현되는 크래시를 수집해 원인 파악.

4) **빌드-테스트 루틴**
   - buildNumber 증가 → EAS 빌드/제출 → TestFlight 처리 완료 확인 → 재현 테스트.

---

## SDK 선택 결론

- **단기**: SDK 53 유지가 현실적 (54는 추가 호환성 리스크 존재)
- **중기**: Expo/EAS가 iOS 26 SDK(Xcode 26) 지원 시점에 업그레이드 검토

