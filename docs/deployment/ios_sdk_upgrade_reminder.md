# iOS SDK 업그레이드 리마인더

> [!WARNING]
> **마감일: 2026년 4월** - 이 날짜 이전에 iOS 26 SDK로 업그레이드 필요

## 배경

2026년 1월 31일, Apple Developer Relations로부터 다음과 같은 알림을 받았습니다:

- **앱 이름**: 약-속
- **App Apple ID**: 6758040367
- **빌드 버전**: 1.0.1 (Build 9)
- **현재 SDK**: iOS 18.5 SDK

## Apple 요구사항

**2026년 4월**부터 모든 iOS 및 iPadOS 앱은:
- **iOS 26 SDK** 이상으로 빌드되어야 함
- **Xcode 26** 이상을 사용해야 함

이 요구사항을 충족하지 않으면 App Store Connect에 업로드하거나 배포용으로 제출할 수 없습니다.

## 필요한 조치

### 1. Xcode 업데이트
- Apple이 Xcode 26을 출시하면 업데이트 (예상: 2026년 상반기)
- 최신 iOS 26 SDK가 포함된 버전 사용

### 2. Expo SDK 업데이트
```bash
# Expo SDK를 iOS 26 지원 버전으로 업데이트
npm install expo@latest
```

### 3. EAS 빌드 재실행
```bash
# iOS 앱 다시 빌드
eas build --platform ios
```

### 4. App Store Connect 제출
- 새 빌드를 App Store Connect에 업로드
- 기존 앱 심사 절차 진행

## 참고자료

- [Apple Developer Documentation](https://developer.apple.com/)
- [Expo SDK Release Notes](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)

## 상태

- [x] 경고 수신 (2026-01-31)
- [ ] Xcode 26 출시 확인
- [ ] Expo SDK 업데이트
- [ ] 새 빌드 생성
- [ ] App Store 제출
