# 푸시 알림 UX 개선

> 최종 업데이트: 2026-02-02

---

## 개요

사용자 경험 개선을 위해 푸시 알림 로직을 변경했습니다.

**변경 전**: 약 단위로 개별 알림 발송 (약 3개 = 알림 3개)
**변경 후**: 시간대 단위로 그룹 알림 발송 (약 3개 = 알림 1개)

---

## 변경 내용

### 1. 시간대별 알림 그룹화

같은 사용자, 같은 날짜, 같은 시간에 예정된 복약은 **1개의 알림**으로 통합됩니다.

#### 예시

| 상황 | 변경 전 | 변경 후 |
|------|---------|---------|
| 아침 08:00에 약 3개 | 알림 3개 | 알림 1개 |
| 점심 12:00에 약 2개 | 알림 2개 | 알림 1개 |
| 저녁 18:00에 약 2개 | 알림 2개 | 알림 1개 |
| **하루 총합** | **7개** | **3개** |

#### 그룹화 기준

- **같은 사용자**: 동일 사용자의 약만 그룹화
- **같은 날짜**: 같은 날의 복약만
- **같은 시간**: 정확히 같은 시간 (08:00과 08:30은 별개)

---

### 2. 시간대별 맞춤 메시지

시간대(time_of_day)에 따라 다른 메시지를 발송합니다.

| 시간대 | 코드 | 제목 | 메시지 |
|--------|------|------|--------|
| 아침 | `morning` | 복약 알림 | 좋은 아침이에요! 아침약 드실 시간이에요. |
| 점심 | `noon` | 복약 알림 | 점심약 드실 시간이에요. |
| 저녁 | `evening` | 복약 알림 | 저녁약 드실 시간이에요. |
| 취침 전 | `night` | 복약 알림 | 주무시기 전 약 드셨나요? |
| 사용자 지정 | `custom` | 복약 알림 | 약 드실 시간이에요. |

---

### 3. 이모지 제거

모든 푸시 알림에서 이모지를 제거하여 깔끔한 알림을 제공합니다.

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 복약 알림 제목 | 💊 복약 시간이에요! | 복약 알림 |
| 테스트 알림 제목 | 🔔 테스트 알림 | 테스트 알림 |
| 보호자 알림 제목 | ⚠️ 복약 미확인 알림 | 복약 미확인 알림 |

---

## 기술 구현

### 수정된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `backend/apps/alerts/tasks.py` | 시간대별 메시지 정의, 중복 발송 방지 로직 |
| `backend/apps/medications/serializers.py` | 알림 예약 시 중복 체크 |
| `backend/apps/alerts/fcm_service.py` | 이모지 제거 |
| `backend/apps/users/views.py` | 테스트 알림 이모지 제거 |

### 핵심 코드

#### 시간대별 메시지 정의 (`tasks.py`)

```python
TIME_SLOT_MESSAGES = {
    'morning': {
        'title': '복약 알림',
        'body': '좋은 아침이에요! 아침약 드실 시간이에요.'
    },
    'noon': {
        'title': '복약 알림',
        'body': '점심약 드실 시간이에요.'
    },
    'evening': {
        'title': '복약 알림',
        'body': '저녁약 드실 시간이에요.'
    },
    'night': {
        'title': '복약 알림',
        'body': '주무시기 전 약 드셨나요?'
    },
    'custom': {
        'title': '복약 알림',
        'body': '약 드실 시간이에요.'
    }
}
```

#### 중복 발송 방지 (`tasks.py`)

```python
# 캐시 키: user_id + 날짜 + 시간
cache_key = f"reminder_sent:{user.id}:{scheduled_time.strftime('%Y-%m-%d-%H-%M')}"

if cache.get(cache_key):
    return {'status': 'skipped', 'reason': 'already_sent_for_time_slot'}

# 알림 발송 후 캐시에 기록 (1시간 유효)
if success:
    cache.set(cache_key, True, 3600)
```

#### 알림 예약 중복 체크 (`serializers.py`)

```python
# 오늘 날짜에 이미 알림이 예약된 시간을 추적
scheduled_alert_times = set()

for schedule_data in schedules_data:
    # ... 스케줄 생성 ...
    
    if current_date == today:
        time_key = schedule_data['scheduled_time'].strftime('%H:%M')
        
        if time_key not in scheduled_alert_times:
            schedule_medication_alert.delay(log.id)
            scheduled_alert_times.add(time_key)
```

---

## 배포 방법

백엔드 코드만 변경되었으므로 서버 재시작만 필요합니다.

```bash
# 서버 접속
ssh -i ~/.ssh/LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.142.149

# 코드 업데이트
cd /app/yak-sok
git pull origin main

# 서버 재시작
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 상태 확인
docker-compose -f docker-compose.prod.yml ps
```

**앱 재빌드 필요 없음**: 알림 메시지는 서버에서 발송하므로 기존 앱 그대로 사용 가능

---

## 테스트 방법

1. 앱에서 같은 시간에 약 2~3개 등록
2. 해당 시간에 알림이 **1개만** 오는지 확인
3. 시간대에 맞는 메시지가 표시되는지 확인

### 예상 결과

- 아침 08:00에 약 3개 등록 → 08:00에 "좋은 아침이에요! 아침약 드실 시간이에요." 1개
- 취침 전 22:00에 약 1개 등록 → 22:00에 "주무시기 전 약 드셨나요?" 1개

---

## 관련 문서

- [복약 관리 API](./04_api_specification.md)
- [Safety Line 구현](./02_backend_development.md#safety-line)
- [FCM 푸시 알림](./02_backend_development.md#푸시-알림)

---

**작성일**: 2026-02-02
**상태**: 배포 완료
