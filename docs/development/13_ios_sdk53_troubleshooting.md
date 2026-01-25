# iOS SDK 53 트러블슈팅 (2026-01-21)

> SDK 53 업그레이드 후 발생한 iOS 빌드/실행 문제 해결 과정

## 📋 문제 요약

| 문제 | 상태 | 우선순위 |
|------|:----:|---------|
| SDK 53 업그레이드 후 iOS 크래시 재발 | 🔄 진행중 | 높음 |
| EAS 빌드 타겟 이름 오류 | 🔄 진행중 | 높음 |
| Dev Client 설치/연결 문제 | 🔄 진행중 | 중간 |

---

## 1. SDK 53 업그레이드 후 크래시 재발

### 1.1 증상
- **날짜**: 2026-01-21
- **증상**: iOS 앱 실행 즉시 크래시 (SIGABRT)
- **빌드 환경**: Expo SDK 53, React Native 0.79.0, React 19.0.0

### 1.2 크래시 로그 분석 (2026-01-21 18:26)

**핵심 정보**:
- `faultingThread: com.facebook.react.ExceptionsManagerQueue`
- `lastExceptionBacktrace`: `objc_exception_throw` + `NSInvocation invoke`
- **New Architecture OFF 확인**: TurboModule 스택 없음, 기존 Bridge 방식 사용 중

**결론**: 
- New Architecture 문제가 아님 (이미 OFF 상태)
- **JavaScript 영역에서 치명적인 에러 발생** → React Native ExceptionsManager가 abort() 호출
- `hermes::vm::JSError::constructStackTraceString_RJS`가 스택에 있음 → JS 에러 발생 직후 스택 트레이스 생성 중 크래시

### 1.3 시도한 해결책

#### ✅ 완료
1. **New Architecture 명시적 비활성화**
   - `app.config.js`에 `expo.newArchEnabled: false` 추가
   - `expo-build-properties` 플러그인에도 `newArchEnabled: false` 설정

2. **EAS 프로젝트 재연결**
   - 새 Expo 계정(`jongwoo3353`)으로 전환
   - `app.config.js`에 `extra.eas.projectId: "7a4687ce-2d65-457c-913b-6e6af74d717f"` 설정

#### 🔄 진행중
3. **Development 빌드로 JS 에러 확인 시도**
   - `eas build --platform ios --profile development` 실행
   - Dev Client 설치 후 `npx expo start --dev-client`로 연결
   - **현재 상태**: Dev Client 실행 시 PC 메트로 로그가 전혀 찍히지 않음 → 네이티브 레벨 크래시 가능성

---

## 2. EAS 빌드 타겟 이름 오류

### 2.1 증상
```
Could not find target 'app' in project.pbxproj
```

### 2.2 원인 분석
- Fastlane(gym)이 "app"이라는 타겟을 찾으려고 함
- Expo managed workflow에서 생성된 iOS 프로젝트의 실제 타겟 이름이 다름
- 타겟 이름은 보통 `expo.name` 또는 `expo.slug` 기반으로 생성됨

### 2.3 시도한 해결책

#### ❌ 실패
1. **slug 변경**: `"yak-sok"` → `"yaksok"` (하이픈 제거)
   - **결과**: EAS 프로젝트 slug 불일치 에러 발생
   - `Project config: Slug for project identified by "extra.eas.projectId" (yak-sok) does not match the "slug" field (yaksok)`

2. **name 변경**: `"약속"` → `"YakSok"` (영어로 변경)
   - **상태**: 아직 빌드 미실행

#### 📝 참고
- Expo managed workflow에서는 타겟 이름을 직접 지정할 수 없음
- `expo prebuild --clean`으로 iOS 프로젝트 재생성 필요할 수 있음
- 또는 `ios/Gymfile` 생성하여 scheme 명시적으로 지정 가능

---

## 3. Dev Client 설치/연결 문제

### 3.1 증상
- Dev Client 앱 설치 후 딥링크(`exp+yak-sok://...`)로 연결 시도
- 앱이 실행되다가 즉시 꺼짐
- PC 메트로 로그에 아무것도 찍히지 않음

### 3.2 원인 추정
- **네이티브 레벨 크래시**: JS 번들 받기 전에 iOS 네이티브 단계에서 크래시
- 또는 **기존 preview 앱과 충돌**: 같은 `bundleIdentifier`로 인한 덮어쓰기 문제

### 3.3 시도한 해결책

#### ✅ 완료
1. **번들ID 분리 시도** (되돌림)
   - `com.jongwoo.yaksok.dev`로 분리 시도 → credentials 문제로 실패
   - 원래 `com.jongwoo.yaksok`으로 복구

2. **앱 이름/스킴 분리**
   - `name: "약속 Dev"` (동적 설정) → 정적 설정으로 변경
   - `scheme: "yaksok-dev"` → 정적 설정으로 변경

#### 🔄 진행중
3. **Development 빌드 재시도**
   - 타겟 이름 문제 해결 후 다시 빌드 예정

---

## 4. 현재 설정 상태

### 4.1 app.config.js
```javascript
{
  expo: {
    name: "YakSok",  // 영어로 변경 (타겟 이름 문제 해결 시도)
    slug: "yak-sok",  // 원래대로 복구
    newArchEnabled: false,  // 명시적 비활성화
    extra: {
      eas: {
        projectId: "7a4687ce-2d65-457c-913b-6e6af74d717f"
      }
    },
    owner: "jongwoo3353"
  }
}
```

### 4.2 eas.json
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    }
  }
}
```

### 4.3 package.json
- `expo: ~53.0.0`
- `react: 19.0.0`
- `react-native: 0.79.0`

---

## 5. 다음 단계

### 우선순위 1: 빌드 타겟 이름 문제 해결
1. `eas build --platform ios --profile development` 재실행
2. "Configure Xcode project" 로그에서 실제 타겟 이름 확인
3. 타겟 이름이 "YakSok"이 아닌 경우:
   - `ios/Gymfile` 생성하여 scheme 명시
   - 또는 `expo prebuild --clean` 후 타겟 이름 확인

### 우선순위 2: JS 에러 원인 파악
1. Development 빌드 성공 후 Dev Client 설치
2. `npx expo start --dev-client` 실행
3. Dev Client로 연결 시도
4. **PC 메트로 로그에 에러가 찍히면**: 그 에러가 원인
5. **여전히 로그가 없으면**: iOS 분석데이터에서 최신 크래시 로그 확인

### 우선순위 3: 대안 검토
- SDK 51로 롤백 (이전에 작동했던 버전)
- 또는 SDK 52로 시도 (중간 단계)

---

## 6. 참고 자료

- [Expo EAS Build iOS 타겟 이름 문제](https://docs.expo.dev/build-reference/ios-builds/)
- [Expo prebuild 문서](https://docs.expo.dev/workflow/prebuild/)
- [Fastlane Gymfile 설정](https://docs.fastlane.tools/actions/gym/)

---

## 7. 알려진 이슈

1. **SDK 53에서 New Architecture OFF여도 크래시 발생**
   - 원인: JS 에러 또는 다른 네이티브 모듈 문제 가능성
   - 해결: Dev Client로 정확한 에러 메시지 확인 필요

2. **EAS 빌드 타겟 이름 불일치**
   - 원인: Expo가 생성하는 타겟 이름과 Fastlane이 찾는 이름 불일치
   - 해결: `expo prebuild` 또는 `Gymfile`로 타겟 이름 명시 필요

3. **Dev Client 연결 시 메트로 로그 없음**
   - 원인: 네이티브 레벨 크래시 또는 번들 받기 전 단계에서 실패
   - 해결: iOS 분석데이터 크래시 로그 확인 필요

---

> **마지막 업데이트**: 2026-01-21  
> **작업자**: Auto (AI Assistant)  
> **상태**: 진행중 - 빌드 타겟 이름 문제 해결 중
