# Android 빌드 (v1.1.7)

> 작성일: 2026-03-30
> 앱 버전: 1.1.7 / versionCode: 1

---

## 개요

기존 iOS 전용이었던 약속 앱의 Android 빌드를 처음으로 진행.
EAS Build를 통해 development(APK) 및 production(AAB) 빌드 완료.

---

## 1. Kotlin 버전 호환성 문제 해결

### 문제점
Android Gradle 빌드 시 `Failed to apply plugin 'expo-root-project' > Key 1.9.0 is missing in the map` 에러 발생.

### 근본 원인
- `@react-native-seoul/kakao-login` 플러그인이 `kotlinVersion`을 명시하지 않으면 **기본값 `1.5.10`**을 `gradle.properties`에 주입
- React Native 0.79 + Expo SDK 53은 **Kotlin 2.0.21**이 필요
- 이전 설정에서 `kotlinVersion: "1.9.0"`을 지정했으나 이 역시 호환 불가

### 해결 방법
`app.config.js`에서 Kotlin 2.0.21을 명시적으로 설정:

```javascript
// expo-build-properties 플러그인
android: {
    newArchEnabled: false,
    kotlinVersion: "2.0.21"  // 추가
}

// kakao-login 플러그인
{
    kakaoAppKey: "...",
    kotlinVersion: "2.0.21"  // 1.9.0 → 2.0.21 변경
}
```

### 주의사항
- 로컬 `npx expo prebuild`로 생성된 `android/` 폴더가 EAS에 업로드되면 오래된 설정이 충돌할 수 있음
- `android/`는 `.gitignore`에 포함되어 있으나, 로컬에 존재할 경우 EAS가 업로드함
- **빌드 전 로컬 `android/` 폴더를 삭제**하면 EAS가 서버에서 최신 설정으로 prebuild 실행

---

## 2. 빌드 결과

| 프로필 | 타입 | 상태 | 비고 |
|--------|------|------|------|
| development | APK | ✅ 빌드 성공 | 내부 테스트용, Dev Server 필요 |
| production | AAB | ✅ 빌드 성공 | Play Store 제출용 |

---

## 3. Android 배포 (향후 진행)

### Play Store 제출 준비
1. **Google Play Console 가입** (개발자 등록비 $25, 1회)
2. **서비스 계정 JSON 생성** → `mobile/google-service-account.json`
3. **EAS Submit 실행**:
   ```bash
   cd mobile
   npx eas-cli submit --platform android --profile production
   ```

### 카카오 로그인 Android 키 해시 등록
```bash
cd mobile
eas credentials --platform android
# SHA-1 fingerprint → Base64로 변환하여 카카오 개발자 콘솔에 등록
```

### Google Android Client ID 발급
- [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 클라이언트 ID → Android 유형
- 패키지: `com.jongwoo.yaksok`
- SHA-1: EAS 키스토어의 인증서 지문

---

## 4. 빌드 명령어 정리

```bash
cd mobile

# Development (APK, Dev Server 필요)
npx eas-cli build --platform android --profile development

# Preview (APK, 독립 실행)
npx eas-cli build --platform android --profile preview

# Production (AAB, Play Store 제출용)
npx eas-cli build --platform android --profile production
```

---

## 관련 파일

| 파일 | 변경 내용 |
|------|-----------|
| `mobile/app.config.js` | `kotlinVersion: "2.0.21"` 추가 (build-properties + kakao-login) |
| `mobile/eas.json` | Android 프로필 설정 (기존 설정 활용) |

---

## 관련 문서

- [19_kakao_login_implementation.md](./19_kakao_login_implementation.md) — 카카오 로그인 구현
- [version_1_1_7_update.md](./version_1_1_7_update.md) — v1.1.7 업데이트 요약
