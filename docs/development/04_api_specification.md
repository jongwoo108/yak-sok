# 04. API 명세

> 작성일: 2026-01-09

## 기본 정보

- **Base URL**: `http://localhost:8000/api`
- **인증**: JWT Bearer Token
- **Content-Type**: `application/json`

---

## 인증 API

### 토큰 발급 (로그인)

```http
POST /api/token/
```

**Request Body**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200)**
```json
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}
```

### 토큰 갱신

```http
POST /api/token/refresh/
```

**Request Body**
```json
{
  "refresh": "eyJ..."
}
```

**Response (200)**
```json
{
  "access": "eyJ..."
}
```

---

## 사용자 API

### 회원가입

```http
POST /api/users/
```

**Request Body**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "password_confirm": "string",
  "first_name": "string",
  "role": "senior | guardian",
  "phone_number": "string"
}
```

**Response (201)**
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "first_name": "string",
  "role": "senior",
  "phone_number": "010-1234-5678"
}
```

### 현재 사용자 정보

```http
GET /api/users/me/
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "role": "senior",
  "phone_number": "010-1234-5678",
  "emergency_contact": "010-9876-5432"
}
```

### FCM 토큰 업데이트

```http
PATCH /api/users/update_fcm_token/
Authorization: Bearer {token}
```

**Request Body**
```json
{
  "fcm_token": "string"
}
```

### 푸시 알림 테스트

```http
POST /api/users/test-push/
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "success": true,
  "message": "테스트 푸시 알림을 보냈습니다.",
  "token": "ExponentPushToken[...]"
}
```

---

## 복약 API

### 약품 목록 조회

```http
GET /api/medications/
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "count": 2,
  "results": [
    {
      "id": 1,
      "name": "혈압약",
      "description": "아침 식후 복용",
      "dosage": "1정",
      "is_active": true,
      "schedules": [
        {
          "id": 1,
          "time_of_day": "morning",
          "time_of_day_display": "아침",
          "scheduled_time": "08:00:00",
          "is_active": true
        }
      ],
      "created_at": "2026-01-09T10:00:00Z"
    }
  ]
}
```

### 약품 등록

```http
POST /api/medications/
Authorization: Bearer {token}
```

**Request Body**
```json
{
  "name": "혈압약",
  "description": "아침 식후 복용",
  "dosage": "1정"
}
```

### 처방전 OCR 스캔

```http
POST /api/medications/scan/
Authorization: Bearer {token}
```

**Request Body**
```json
{
  "image_base64": "data:image/jpeg;base64,..."
}
```

**Response (200)**
```json
{
  "medications": [
    {
      "name": "아스피린",
      "dosage": "1정",
      "frequency": "하루 3회",
      "times": ["morning", "noon", "evening"]
    }
  ],
  "message": "OCR 처리가 완료되었습니다."
}
```

### 음성 명령 처리

```http
POST /api/medications/voice_command/
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body**
```
audio: (binary file)
```

**Response (200)**
```json
{
  "success": true,
  "transcribed_text": "아침 8시에 혈압약 추가해줘",
  "action": "add_schedule",
  "message": "음성 명령이 처리되었습니다."
}
```

### 오늘의 복약 기록

```http
GET /api/medications/logs/today/
Authorization: Bearer {token}
```

**Response (200)**
```json
[
  {
    "id": 1,
    "schedule": 1,
    "medication_name": "혈압약",
    "scheduled_datetime": "2026-01-09T08:00:00Z",
    "taken_datetime": null,
    "status": "pending",
    "status_display": "대기 중"
  }
]
```

### 복약 완료 처리

```http
POST /api/medications/logs/{id}/take/
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "id": 1,
  "status": "taken",
  "taken_datetime": "2026-01-09T08:15:00Z"
}
```

---

## 알림 API

### 알림 목록 조회

```http
GET /api/alerts/
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "results": [
    {
      "id": 1,
      "alert_type": "warning",
      "alert_type_display": "미복약 경고",
      "status": "sent",
      "status_display": "발송됨",
      "title": "미복약 알림",
      "message": "혈압약 복용 시간이 30분 경과했습니다.",
      "scheduled_at": "2026-01-09T08:30:00Z",
      "sent_at": "2026-01-09T08:30:00Z"
    }
  ]
}
```

### 대기 중인 알림 조회

```http
GET /api/alerts/pending/
Authorization: Bearer {token}
```

---

## 비상 연락처 API

### 비상 연락처 목록

```http
GET /api/alerts/emergency-contacts/
Authorization: Bearer {token}
```

**Response (200)**
```json
[
  {
    "id": 1,
    "name": "김보호자",
    "phone_number": "010-1111-2222",
    "contact_type": "guardian",
    "contact_type_display": "보호자",
    "priority": 1,
    "is_active": true
  }
]
```

### 비상 연락처 등록

```http
POST /api/alerts/emergency-contacts/
Authorization: Bearer {token}
```

**Request Body**
```json
{
  "name": "김보호자",
  "phone_number": "010-1111-2222",
  "contact_type": "guardian",
  "priority": 1
}
```

### 비상 연락처 삭제

```http
DELETE /api/alerts/emergency-contacts/{id}/
Authorization: Bearer {token}
```

---

## 에러 응답

### 400 Bad Request
```json
{
  "error": "잘못된 요청입니다.",
  "details": { "field_name": ["오류 메시지"] }
}
```

### 401 Unauthorized
```json
{
  "detail": "인증 정보가 제공되지 않았습니다."
}
```

### 404 Not Found
```json
{
  "detail": "찾을 수 없습니다."
}
```

### 500 Internal Server Error
```json
{
  "error": "서버 오류가 발생했습니다."
}
```
