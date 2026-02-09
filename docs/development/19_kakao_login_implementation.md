# 카카오 로그인 및 UI/UX 개선 (v1.1.3)

> 최종 업데이트: 2026-02-07
> 앱 버전: 1.1.3

---

## 개요

카카오 로그인 기능(Native SDK) 구현, 구글 로그인 버튼 디자인 복구, 그리고 건강 피드 UI/UX 개선 내역을 정리한 문서.

---

## 1. 카카오 로그인 구현 (Native SDK)

### 1.1 패키지 및 설정
- **패키지**: `@react-native-seoul/kakao-login` 설치
- **app.config.js 설정**:
  - 플러그인 추가: `plugins` 배열에 `@react-native-seoul/kakao-login` 추가
  - **Native App Key**: 카카오 개발자 콘솔의 "네이티브 앱 키"(`e678...`) 사용 (REST API 키 아님)
  - **iOS/Android 설정**: `kotlinVersion: "1.9.0"` 명시

### 1.2 모바일 구현
- **파일**: `mobile/app/(auth)/login.tsx`
- **변경**:
  - `KakaoLoginButton` 컴포넌트 동작 구현
  - `KakaoLogin.login()` 호출하여 Access Token 획득
  - 획득한 토큰을 `handleKakaoLoginSuccess`로 전달하여 백엔드 인증 진행
  - "준비 중" 알림 제거 및 실제 로그인 로직 연결

### 1.3 백엔드 및 배포
- **엔드포인트**: `POST /api/users/login/kakao/` (기존 구현 활용)
- **배포**:
  - 로컬 코드(`backend/apps/users/urls.py`, `views.py`)의 변경사항이 서버에 반영되지 않아 404 에러 발생 확인
  - `git push` 및 Lightsail 서버에서 `git pull`, `docker-compose up -d --build` 수행하여 해결

### 1.4 플랫폼 등록
- **카카오 개발자 콘솔**:
  - **iOS**: Bundle ID `com.jongwoo.yaksok` 등록
  - **Android**: 패키지명 `com.jongwoo.yaksok` 등록 (키 해시는 Android 빌드 후 등록 필요)

---

## 2. UI/UX 개선

### 2.1 구글 로그인 버튼 디자인
- **파일**: `mobile/app/(auth)/login.tsx`
- **조치**: 파스텔 블루 배경에서 **흰색 배경(#FFFFFF)**으로 원복
- **스타일**:
  - 테두리: `#DADCE0` (연한 회색)
  - 텍스트: `#3C4043` (진한 회색)
  - 그림자: Elevation 2 적용

### 2.2 건강 피드 새로고침
- **파일**: `mobile/app/(tabs)/health-feed.tsx`
- **변경**:
  - 프로필 섹션의 **수동 새로고침 버튼(아이콘) 제거**
  - `RefreshControl` (Pull-to-refresh) 기능은 유지
  - 사용자가 화면을 위로 당겨서 자연스럽게 새로고침하도록 유도 (유튜브/인스타그램 방식)

---

## 3. 빌드 및 배포 참고사항

### 3.1 네이티브 모듈 빌드
카카오 로그인은 네이티브 모듈을 사용하므로 **EAS Build**가 필수입니다.
```bash
# 설정 변경 적용
npx expo prebuild --clean

# iOS 개발 빌드
eas build --profile development --platform ios

# Android 개발 빌드 (예정)
eas build --profile development --platform android
```

### 3.2 안드로이드 추가 설정 (예정)
Android 빌드 완료 후 생성된 **키 해시(Key Hash)**를 카카오 개발자 콘솔 [내 애플리케이션] > [플랫폼] > [Android]에 등록해야 로그인이 정상 동작합니다.

---

## 관련 문서
- [04_authentication_implementation.md](./04_authentication_implementation.md) - 인증 구현 상세
