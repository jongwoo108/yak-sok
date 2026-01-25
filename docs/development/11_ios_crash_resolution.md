# iOS 크래시 해결 기록

## 문제 요약

**발생일**: 2026-01-20 ~ 2026-01-21  
**증상**: iOS 앱 실행 즉시 크래시 (SIGABRT)  
**빌드 환경**: Expo SDK 54, React Native 0.81.5, EAS Build

---

## 원인 분석

### 크래시 로그
```
Queue: com.facebook.react.ExceptionsManagerQueue
Exception Type: EXC_CRASH (SIGABRT)
termination: Abort trap: 6
lastExceptionBacktrace: objc_exception_rethrow
```

### 근본 원인
**Expo SDK 54의 New Architecture (TurboModules/Fabric)**와 일부 네이티브 모듈 간 호환성 문제

| SDK 버전 | 기본 아키텍처 | iOS 호환성 |
|---------|-------------|-----------|
| SDK 51 이하 | Old Architecture | ✅ 안정 |
| SDK 52+ | New Architecture | ⚠️ 일부 모듈 비호환 |

---

## 시도한 해결책

### 1. 알림 서비스 지연 초기화 (실패 ❌)
```typescript
// setNotificationHandler를 앱 마운트 후 호출
static async initialize() {
    Notifications.setNotificationHandler({...});
}
```
→ 크래시 지속

### 2. expo-notifications 완전 제거 (실패 ❌)
- `notification.ts`에서 모든 expo-notifications 코드 제거
- `app.json`에서 플러그인 제거
- `package.json`에서 의존성 제거

→ 크래시 지속 (다른 네이티브 모듈도 원인)

### 3. SDK 51 다운그레이드 (성공 ✅)
- Expo SDK 54 → SDK 51
- React Native 0.81.5 → 0.74.5
- React 19.1.0 → 18.2.0

→ **앱 정상 작동**

---

## 최종 해결책

### package.json 주요 변경
```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "expo-router": "~3.5.24",
    "expo-notifications": "~0.28.19"
    // ... SDK 51 호환 버전들
  }
}
```

### app.json 플러그인 설정
```json
{
  "plugins": [
    "expo-router"
  ]
}
```
> ⚠️ SDK 51에서는 `expo-secure-store`, `expo-web-browser`, `expo-notifications` 등을 플러그인으로 등록하면 오류 발생

---

## 향후 업그레이드 시 주의사항

1. **New Architecture 호환성 확인**
   - 모든 네이티브 모듈이 New Architecture 지원하는지 확인
   - https://reactnative.directory 에서 호환성 체크

2. **단계적 업그레이드**
   - SDK 51 → 52 → 53 → 54 순서로 업그레이드
   - 각 단계에서 iOS 빌드 테스트

3. **newArchEnabled 설정**
   ```json
   {
     "expo": {
       "newArchEnabled": false
     }
   }
   ```
   - 필요 시 명시적으로 비활성화

---

## 관련 링크

- [Expo SDK 52 Release Notes](https://expo.dev/changelog/2024/11-12-sdk-52)
- [React Native New Architecture](https://reactnative.dev/docs/new-architecture-intro)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
