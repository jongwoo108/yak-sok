# 15. 푸시 알림 및 기능 개선 (v1.0.1)

> 작성일: 2026-01-31

## 개요

이 문서는 v1.0.1 업데이트에서 수행된 푸시 알림 문제 해결 및 기능 개선 사항을 기록합니다.

---

## 1. 푸시 알림 문제 해결

### 문제 상황
- TestFlight 빌드에서 푸시 알림이 전혀 수신되지 않음
- 연결 기능은 정상 작동하나 알림만 실패

### 근본 원인 분석
`NotificationService.updateServerToken()` 함수가 정의되어 있었으나, **앱 어디에서도 호출되지 않음**.

| 시점 | 문제 |
|------|------|
| 로그인 성공 후 | FCM 토큰 서버 전송 코드 없음 |
| 회원가입 후 | 동일하게 FCM 토큰 전송 없음 |
| 앱 재실행 시 | FCM 토큰 갱신/전송 없음 |

**결과**: 백엔드 DB에 `user.fcm_token`이 비어있어서 푸시 알림 발송 시 "FCM 토큰 없음"으로 스킵됨.

### 수정 내용

#### 1) login.tsx
```typescript
// 로그인 성공 후 FCM 토큰 서버 전송 추가
import { NotificationService } from '../../services/notification';

// handleLogin 함수 내부
setUser(user);
await NotificationService.updateServerToken(); // 추가됨
router.replace('/(tabs)');

// handleGoogleLoginSuccess 함수도 동일하게 수정
```

#### 2) register.tsx
```typescript
// 회원가입 성공 후 FCM 토큰 서버 전송 추가
import { NotificationService } from '../../services/notification';

// handleRegister 함수 내부
setUser(user);
await NotificationService.updateServerToken(); // 추가됨
Alert.alert('가입 완료', ...);
```

#### 3) notification.ts (Expo SDK 53 호환성)
```typescript
// NotificationBehavior에 필수 속성 추가
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,  // 추가됨
        shouldShowList: true,    // 추가됨
    }),
});
```

### 알림 플로우 (수정 후)
```
로그인/회원가입 
    → updateServerToken() 호출 
    → Expo Push Token 발급 
    → 서버 API (PATCH /users/update_fcm_token/)
    → DB에 fcm_token 저장
    → 알림 발송 시 해당 토큰으로 푸시
```

---

## 2. 약 이름 편집 기능 추가

### 요구사항
- AI 스캔 후 잘못 인식된 약 이름을 사용자가 직접 수정할 수 있어야 함

### 수정 파일
`mobile/app/medications/scan.tsx`

### 구현 내용

#### 새 함수 추가
```typescript
// 약 이름 수정
const updateMedicationName = (index: number, name: string) => {
    setMedicationsToEdit(prev => {
        const updated = [...prev];
        updated[index].name = name;
        return updated;
    });
};

// 용량 수정
const updateMedicationDosage = (index: number, dosage: string) => {
    setMedicationsToEdit(prev => {
        const updated = [...prev];
        updated[index].dosage = dosage;
        return updated;
    });
};
```

#### UI 변경
```diff
- <Text style={styles.medicationName}>{med.name}</Text>
- <Text style={styles.medicationDosage}>{med.dosage}</Text>
+ <TextInput
+     style={styles.medicationNameInput}
+     value={med.name}
+     onChangeText={(text) => updateMedicationName(medIndex, text)}
+     placeholder="약 이름"
+     editable={!med.isDuplicate}
+ />
+ <TextInput
+     style={styles.medicationDosageInput}
+     value={med.dosage}
+     onChangeText={(text) => updateMedicationDosage(medIndex, text)}
+     placeholder="용량 (예: 1정)"
+     editable={!med.isDuplicate}
+ />
```

---

## 3. 복약 알림 기본값 변경

### 요구사항
- 메인 화면("오늘의 약속")에서 복약 알림 토글이 기본 ON 상태여야 함

### 수정 파일
`mobile/app/(tabs)/index.tsx`

### 변경 내용
```diff
- const [notificationEnabled, setNotificationEnabled] = useState(false);
+ const [notificationEnabled, setNotificationEnabled] = useState(true);
```

---

## 4. 앱 이름 변경

### 변경 내용
`mobile/app.config.js`

```diff
- name: "약쏙",
+ name: "약속",
```

---

## 5. 버전 정보

### app.config.js
```javascript
{
    name: "약속",
    version: "1.0.1",
    ios: {
        buildNumber: "9"
    }
}
```

---

## 6. 테스트 결과

| 항목 | 결과 |
|------|------|
| 푸시 알림 (Development 빌드) | ✅ 정상 작동 |
| 푸시 알림 (TestFlight) | ✅ 정상 작동 |
| 약 이름 편집 | ✅ 정상 작동 |
| 복약 알림 기본 ON | ✅ 정상 작동 |

---

## 7. 관련 파일

| 파일 | 변경 내용 |
|------|-----------|
| `mobile/app/(auth)/login.tsx` | FCM 토큰 전송 추가 |
| `mobile/app/(auth)/register.tsx` | FCM 토큰 전송 추가 |
| `mobile/services/notification.ts` | SDK 53 호환성 수정 |
| `mobile/app/medications/scan.tsx` | 약 이름/용량 편집 기능 |
| `mobile/app/(tabs)/index.tsx` | 알림 토글 기본값 변경 |
| `mobile/app.config.js` | 앱 이름, 버전 변경 |

---

## 8. 배포

- **빌드**: `eas build --platform ios --profile production`
- **제출**: `eas submit --platform ios`
- **App Store Connect**: 심사 제출 완료 (2026-01-31)
