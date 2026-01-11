# 05. React Native 앱 구현 계획

> 작성일: 2026-01-10

## 개요

웹(Next.js)으로 구현된 Yak-Sok을 **React Native**로 포팅하여 iOS/Android 네이티브 앱으로 배포합니다.
기존 백엔드 API를 그대로 활용하며, 비즈니스 로직의 재사용성을 극대화합니다.

---

## 기술 스택

| 구분 | 선택 | 이유 |
|------|------|------|
| **Framework** | Expo (Managed Workflow) | 빠른 개발, EAS Build로 쉬운 배포, 푸시 알림 지원 |
| **Navigation** | Expo Router | 파일 기반 라우팅 (Next.js와 유사) |
| **State** | Zustand | 웹과 동일하게 사용, 코드 재사용 가능 |
| **Styling** | StyleSheet + Custom Theme | `components/theme.ts`에 색상/간격/그림자 정의 (NativeWind 미사용) |
| **API Client** | Axios | 웹과 동일한 API 서비스 파일 활용 |
| **Push Notifications** | expo-notifications + FCM | Android/iOS 통합 푸시 알림 |
| **Camera/OCR** | expo-camera + expo-image-picker | 처방전 스캔 기능 |

---

## 프로젝트 구조

```
yak-sok/
├── backend/          # (기존) Django REST API - 변경 없음
├── frontend/         # (기존) Next.js Web App - 변경 없음
└── mobile/           # (NEW) React Native App
    ├── app/          # Expo Router 스크린
    │   ├── (auth)/   # 로그인/회원가입 그룹
    │   │   ├── login.tsx
    │   │   └── register.tsx
    │   ├── (tabs)/   # 메인 탭 그룹
    │   │   ├── index.tsx      # 홈 (오늘의 복약)
    │   │   ├── medications.tsx # 약 목록
    │   │   └── profile.tsx    # 설정
    │   ├── medications/
    │   │   ├── add.tsx        # 약 추가
    │   │   └── scan.tsx       # 처방전 스캔
    │   └── _layout.tsx
    ├── components/   # 재사용 UI 컴포넌트
    │   ├── NeumorphCard.tsx      # 뉴모피즘 카드
    │   ├── NeumorphIconButton.tsx # 뉴모피즘 아이콘 버튼
    │   ├── GradientBackground.tsx # 배경 그라디언트
    │   └── theme.ts              # 색상/간격/그림자 정의
    ├── services/     # API, Firebase, Store
    │   ├── api.ts
    │   ├── store.ts
    │   └── types.ts
    ├── app.json      # Expo 설정
    ├── eas.json      # EAS Build 설정
    └── package.json
```

---

## 개발 단계

> **현재 진행률**: Phase 1, 2, 3 완료 + Phase 2.6 진행 중 (약 95%)
> 
> 📅 **마지막 업데이트**: 2026-01-11

| 상태 | 의미 |
|:---:|------|
| ✅ | 완료 |
| 🔄 | 진행 중 |
| ⬜ | 미완료 |

---

### Phase 1: 프로젝트 셋업 & 인증 ✅

- [x] ✅ Expo 프로젝트 생성 (`npx create-expo-app@latest mobile`)
- [x] ✅ 필수 패키지 설치 (Zustand, Axios, expo-router, expo-secure-store)
- [x] ✅ 기존 `services/api.ts`, `store.ts`, `types.ts` 로직 복사 및 수정
- [x] ✅ 로그인/회원가입 화면 구현 (`app/(auth)/login.tsx`, `register.tsx`)
- [x] ✅ JWT 토큰 저장 연동 완료 (expo-secure-store)
- [x] ✅ EAS 프로젝트 초기화 및 연결 (`npx eas init`)

### Phase 2: 핵심 기능 ✅

- [x] ✅ 탭 네비게이션 구성 (홈, 약 목록, 설정) - `app/(tabs)/_layout.tsx`
- [x] ✅ 홈 화면 구현 (오늘의 복약 목록, 복용 완료 버튼) - `app/(tabs)/index.tsx`
- [x] ✅ 약 목록 화면 (내 약 관리, 삭제 기능) - `app/(tabs)/medications.tsx`
- [x] ✅ 약 추가 화면 (수동 입력, 시간대 선택) - `app/medications/add.tsx`
- [x] ✅ 설정 화면 (프로필) - `app/(tabs)/profile.tsx`
- [x] ✅ 처방전 스캔 화면 (expo-image-picker + OCR API) - `app/medications/scan.tsx`

### Phase 2.5: UI 테마 적용 (Neumorphism & Ocean Theme) ✅

> 💡 웹과 동일한 **파스텔 뉴모피즘** 디자인을 React Native에 적용

- [x] ✅ 색상 팔레트 통일 (`components/theme.ts`)
  - `colors.mint`, `colors.cream`, `colors.pink` 등 웹과 동일한 색상
- [x] ✅ 공통 컴포넌트 생성
  - `components/NeumorphCard.tsx` - 뉴모피즘 카드 (default/inset 변형)
  - `components/NeumorphIconButton.tsx` - 원형 아이콘 버튼
  - `components/GradientBackground.tsx` - 유기적 배경
- [x] ✅ 전 화면 스타일 리팩토링 완료 (Home, Medications, Add, Profile, Scan)

### Phase 2.6: UI 일관성 & 기능 개선 ✅ (NEW)

> 📅 2026-01-11 추가

- [x] ✅ **탭 헤더 정렬 통일**: 모든 탭(홈, 약 목록, 설정)의 아이콘/타이틀 수직 위치 통일
- [x] ✅ **아이콘 색상 통일**: 설정 탭 톱니바퀴, 약 목록 그룹 아이콘 색상을 Primary로 통일
- [x] ✅ **전체 선택 기능**: 편집 모드에서 전체 선택/해제 버튼 추가
- [x] ✅ **그룹 삭제 기능**: 편집 모드에서 그룹 단위 일괄 삭제 지원
- [x] ✅ **FAB 버튼 3D 스타일링**: 처방전 스캔/직접 추가 버튼에 듀얼 섀도우 뉴모피즘 적용
- [x] ✅ **처방전 스캔 UX 개선**: 에러 핸들링 강화, 로딩 UI 중앙 정렬

### Phase 3: 푸시 알림 ✅

- [x] ✅ expo-notifications 설정 및 권한 획득
- [x] ✅ FCM/Expo Push Token 등록 로직 (백엔드 연동)
- [x] ✅ 하이브리드 푸시 서버 구축 (Firebase + Expo 지원)
- [x] ✅ 푸시 알림 발송 테스트 및 검증 완료

### Phase 4: 배포 ⬜

- [ ] ⬜ EAS Build 설정 (`eas.json`)
- [ ] ⬜ 앱 아이콘, 스플래시 스크린 디자인
- [ ] ⬜ App Store Connect 계정 준비 (iOS)
- [ ] ⬜ Google Play Console 계정 준비 (Android)
- [ ] ⬜ TestFlight / 내부 테스트 배포
- [ ] ⬜ Production 출시

---

## 웹-모바일 코드 재사용 전략

### 재사용 가능한 파일

| 파일 | 재사용 정도 | 수정 필요 사항 |
|------|-------------|----------------|
| `services/api.ts` | 95% | Base URL 환경변수만 수정 |
| `services/store.ts` | 90% | Storage 로직만 AsyncStorage로 변경 |
| `services/types.ts` | 100% | 그대로 사용 |

### 새로 작성 필요한 파일

| 파일 | 설명 |
|------|------|
| `services/firebase.ts` | `@react-native-firebase/app` 사용 |
| `components/*` | React Native 전용 UI 컴포넌트 |
| `app/**/*.tsx` | 모든 화면 컴포넌트 |

---

## 디자인 가이드

웹의 **3D Pastel Claymorphism** 테마를 React Native에서 구현:

- **react-native-shadow-2**: 소프트 섀도우 효과
- **NativeWind**: Tailwind 유틸리티 클래스
- **LinearGradient**: 그라데이션 배경
- **고대비 색상**: `--color-mint`, `--color-cream` 등 동일 팔레트 사용

---

## 실행 방법

```bash
cd mobile

# 의존성 설치
npm install

# iOS 시뮬레이터에서 실행
npx expo start --ios

# Android 에뮬레이터에서 실행
npx expo start --android

# Expo Go 앱으로 실행 (QR 코드 스캔)
npx expo start
```

---

## 참고 자료

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://expo.github.io/router/docs/)
- [NativeWind](https://www.nativewind.dev/)
- [React Native Firebase](https://rnfirebase.io/)
