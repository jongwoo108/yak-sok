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
| **Styling** | NativeWind (Tailwind for RN) | 웹과 유사한 스타일링 경험 |
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
    ├── services/     # API, Firebase, Store
    │   ├── api.ts
    │   ├── store.ts
    │   └── firebase.ts
    ├── app.json      # Expo 설정
    ├── eas.json      # EAS Build 설정
    └── package.json
```

---

## 개발 단계

### Phase 1: 프로젝트 셋업 & 인증

- [ ] Expo 프로젝트 생성 (`npx create-expo-app@latest mobile`)
- [ ] 필수 패키지 설치 (Zustand, Axios, NativeWind, expo-router)
- [ ] 기존 `services/api.ts`, `store.ts` 로직 복사 및 수정
- [ ] Firebase Auth 연동 (Google Login)
- [ ] 로그인/회원가입 화면 구현
- [ ] JWT 토큰 저장 (expo-secure-store)

### Phase 2: 핵심 기능

- [ ] 탭 네비게이션 구성 (홈, 약 목록, 설정)
- [ ] 홈 화면 구현 (오늘의 복약 목록, 복용 완료 버튼)
- [ ] 약 목록 화면 (내 약 관리, 삭제 기능)
- [ ] 약 추가 화면 (수동 입력, 시간대 선택)
- [ ] 처방전 스캔 화면 (expo-camera + OCR API)

### Phase 3: 푸시 알림

- [ ] expo-notifications 설정
- [ ] FCM 토큰 등록 로직 (백엔드 연동)
- [ ] 포그라운드/백그라운드 알림 처리
- [ ] 알림 클릭 시 딥링크 처리

### Phase 4: 배포

- [ ] EAS Build 설정 (`eas.json`)
- [ ] 앱 아이콘, 스플래시 스크린 디자인
- [ ] App Store Connect 계정 준비 (iOS)
- [ ] Google Play Console 계정 준비 (Android)
- [ ] TestFlight / 내부 테스트 배포
- [ ] Production 출시

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
