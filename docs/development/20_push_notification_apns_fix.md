# 20. 푸시 알림 APNS Push Key 복구 (2026-02-21)

> 작성일: 2026-02-21

## 개요

iOS 푸시 알림이 수신되지 않는 문제를 진단하고 해결했습니다.  
Expo 계정 변경 과정에서 Apple Push Notification Service (APNS) Push Key가 무효화된 것이 원인이었습니다.

---

## 증상

- senior001, guardian001 계정에서 복약 알림이 수신되지 않음
- 서버 Celery Worker 로그에는 **"알림 발송 성공"**으로 표시됨
- Expo Push API도 `"status": "ok"` 반환

---

## 진단 과정

### 1. 인프라 확인 → 정상
```bash
docker-compose -f docker-compose.prod.yml ps
```
- backend, celery_worker, celery_beat, redis, db 모두 **Up** 상태

### 2. FCM 토큰 확인 → 정상
```python
# senior001: ExponentPushToken[Cfp2EKMo5aAeWJIHgrILyC]
# guardian001: ExponentPushToken[nZUhkZKi_bqxEhor8fB6no]
```

### 3. MedicationLog 확인 → 정상 (오늘 pending 로그 존재)

### 4. Expo Push Receipt 확인 → **에러 발견**
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell -c "
import json, urllib.request, ssl, time

ticket_id = '<ticket_id>'
time.sleep(5)

url = 'https://exp.host/--/api/v2/push/getReceipts'
payload = {'ids': [ticket_id]}
data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

with urllib.request.urlopen(req, context=ctx) as resp:
    print(json.dumps(json.loads(resp.read().decode('utf-8')), indent=2))
"
```

**결과:**
```json
{
  "status": "error",
  "details": {
    "apns": {
      "reason": "InvalidProviderToken",
      "statusCode": 403
    },
    "error": "InvalidCredentials"
  }
}
```

---

## 근본 원인

| 항목 | 상세 |
|------|------|
| **원인** | Expo 무료 빌드 횟수 초과로 계정 변경 시 APNS Push Key가 무효화 |
| **메커니즘** | Apple Developer Portal에서 Push Key(p8)가 삭제되었으나, EAS에는 이전 키 참조가 남아있음 |
| **결과** | Expo → APNS 인증 실패 (`InvalidProviderToken`, 403) |
| **특이사항** | Expo Push API는 `"status": "ok"` 반환 (Expo가 수신만 했을 뿐 APNS 전달은 실패) |

> **주의**: Expo API의 `"status": "ok"`는 Expo 서버가 메시지를 수신했다는 의미이지, 실제 기기 전달 성공을 의미하지 않습니다. 반드시 **Receipt API**로 최종 전달 상태를 확인해야 합니다.

---

## 해결 방법

### 1. EAS에서 Push Key 교체
```bash
cd mobile
eas credentials
# → iOS → production → Push Notifications
# → Remove a push key from your account (기존 무효 키 삭제)
# → Add a new push key (새 키 자동 생성)
```

### 2. 결과
| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| Push Key ID | YCDJV7V6D2 (무효) | CGZK6VR697 (유효) |
| APNS 상태 | `InvalidProviderToken` (403) | 정상 전달 |

### 3. 앱 재빌드 불필요
Push Key는 Expo 서버 ↔ Apple 간 인증에 사용되므로, 키 교체만으로 즉시 작동합니다.  
기존 앱의 Expo Push Token은 그대로 유효합니다.

---

## 향후 주의사항

1. **Expo 계정 변경 시** 반드시 `eas credentials`에서 Push Key 상태 확인
2. **알림 미수신 디버깅 시** Expo Push API 응답만으로 판단하지 말고, **Receipt API**로 최종 전달 확인
3. **테스트 알림 발송 방법** (서버에서):
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend python manage.py shell -c "
   from apps.users.models import User
   import json, urllib.request, ssl
   user = User.objects.get(username='senior001@example.com')
   payload = {'to': user.fcm_token, 'title': '테스트', 'body': '알림 테스트', 'sound': 'default'}
   req = urllib.request.Request('https://exp.host/--/api/v2/push/send', json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
   ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
   print(json.loads(urllib.request.urlopen(req, context=ctx).read().decode()))
   "
   ```

---

## 관련 문서

- [09. 알림 시스템](./09_notification_system.md)
- [15. 푸시 알림 수정 (v1.0.1)](./15_push_notification_fix.md)
- [15. 알림 UX 개선](./15_notification_improvement.md)

---

**상태**: 해결 완료 ✅
