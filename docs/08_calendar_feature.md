# 08. 복약 캘린더 및 알림 기능

> 작성일: 2026-01-17

## 개요

복약 캘린더는 월별 복약 현황을 시각화하고, 병원 방문일을 자동으로 계산하여 표시하는 기능입니다. 또한 연결된 사용자(시니어-보호자) 간에 직접 알림을 주고받을 수 있는 기능도 추가되었습니다.

---

## 1. 복약 캘린더

### 1.1 기능 설명

- **월별 복약 현황**: 각 날짜별 복약 완료/일부/미복용 상태를 색상 점으로 표시
- **병원 방문일 표시**: 처방 일수 기반으로 약이 떨어지는 날을 파란색으로 표시
- **일별 상세 조회**: 날짜 선택 시 해당 날짜의 복약 기록 표시
- **일괄 수정**: 같은 날짜의 여러 약 처방 일수를 한 번에 수정

### 1.2 데이터 모델

```python
# backend/apps/medications/models.py

class Medication(models.Model):
    # 기존 필드...
    
    # 병원 방문일 계산용 필드 추가
    days_supply = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='처방 일수'
    )
    start_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='복용 시작일'
    )
    
    @property
    def end_date(self):
        """처방 종료일 (= 다음 병원 방문일) 계산"""
        if self.start_date and self.days_supply:
            from datetime import timedelta
            return self.start_date + timedelta(days=self.days_supply)
        return None
```

### 1.3 API 엔드포인트

#### 캘린더 데이터 조회

```
GET /api/medications/logs/calendar/?year=2026&month=1
```

**응답:**
```json
{
    "daily_summary": {
        "2026-01-15": {
            "total": 3,
            "taken": 3,
            "missed": 0
        },
        "2026-01-16": {
            "total": 3,
            "taken": 1,
            "missed": 2
        }
    },
    "hospital_visits": [
        {
            "date": "2026-02-14",
            "medication_id": 1,
            "medication_name": "혈압약",
            "days_supply": 30
        }
    ]
}
```

### 1.4 캘린더 마커 색상

| 색상 | Hex 코드 | 의미 |
|------|----------|------|
| 초록 | `#66BB6A` | 모든 약 복용 완료 |
| 노랑 | `#FFC107` | 일부 복용 |
| 빨강 | `#EF5350` | 미복용 |
| 파랑 | `#2196F3` | 병원 방문일 |

### 1.5 화면 구성

```
┌─────────────────────────────────────┐
│           복약 캘린더               │
│    매일의 복약 현황을 확인하세요    │
├─────────────────────────────────────┤
│  [완료●] [일부●] [미복용●] [병원●]  │  ← 범례
├─────────────────────────────────────┤
│         < 2026년 1월 >              │
│  일  월  화  수  목  금  토         │
│           1   2   3   4             │
│   5   6   7   8   9  10  11        │
│  12  13  14  15● 16● 17  18        │  ← 날짜별 마커
│  ...                                │
├─────────────────────────────────────┤
│  🏥 병원 방문일                     │  ← 선택된 날짜가 병원 방문일인 경우
│  혈압약 - 30일치 처방 종료          │
│  [3개 약 일괄 수정]                 │
├─────────────────────────────────────┤
│  2026년 1월 15일 수요일             │
│  ✅ 모든 약 복용 완료 (3/3)         │
│  ────────────────────────────       │
│  ✓ 혈압약 - 아침 • 1정              │
│  ✓ 당뇨약 - 점심 • 1정              │
│  ✓ 영양제 - 저녁 • 2정              │
└─────────────────────────────────────┘
```

---

## 2. 처방전 스캔 시 처방 일수 입력

### 2.1 기능 설명

처방전을 스캔할 때 처방 일수를 입력하면:
1. `start_date`가 스캔 시점(오늘)으로 자동 설정
2. `end_date`가 자동 계산되어 캘린더에 병원 방문일로 표시

### 2.2 화면 구성

```
┌─────────────────────────────────────┐
│           처방 일수                 │
│  ┌─────────────────────────────┐    │
│  │           30                │ 일 │  ← 숫자 입력
│  └─────────────────────────────┘    │
│  입력하면 약이 떨어지는 날을         │
│  캘린더에 표시합니다                 │
│  ────────────────────────────       │
│  📅 다음 병원 방문일: 2월 16일      │  ← 자동 계산된 날짜 미리보기
└─────────────────────────────────────┘
```

---

## 3. 사용자 간 알림 전송

### 3.1 기능 설명

연결된 사용자(시니어-보호자) 간에 직접 알림을 보낼 수 있습니다.

| 발신자 | 수신자 | 메시지 유형 |
|--------|--------|-------------|
| 보호자 | 시니어 | 안부 확인, 약 드셨나요? |
| 시니어 | 보호자 | 괜찮아요, 도움 필요해요 |

### 3.2 API 엔드포인트

#### 알림 전송

```
POST /api/alerts/send/
```

**요청:**
```json
{
    "recipient_id": 1,
    "message_type": "check_in",
    "custom_message": ""
}
```

**메시지 유형:**
- `check_in`: 안부 확인
- `reminder`: 약 드셨나요?
- `im_ok`: 괜찮아요
- `need_help`: 도움 필요해요
- `custom`: 직접 입력

**응답:**
```json
{
    "success": true,
    "message": "홍길동님에게 알림을 보냈습니다.",
    "alert_id": 123
}
```

### 3.3 권한 검증

- `GuardianRelation` 테이블에서 연결 관계 확인
- 연결되지 않은 사용자에게는 알림 전송 불가 (403 Forbidden)

### 3.4 화면 구성 (프로필 화면)

```
┌─────────────────────────────────────┐
│  연결된 보호자                      │
│  ────────────────────────────       │
│  [김] 김보호자                      │
│       탭하여 알림 보내기     [📤]   │
└─────────────────────────────────────┘
          ↓ 탭 시 모달 열림
┌─────────────────────────────────────┐
│         알림 보내기                 │
│       김보호자님에게                │
│  ┌─────────┐  ┌─────────┐          │
│  │   ✓     │  │   !     │          │
│  │괜찮아요 │  │도움필요 │          │
│  └─────────┘  └─────────┘          │
│              [닫기]                 │
└─────────────────────────────────────┘
```

---

## 4. 관련 파일 목록

### Backend

| 파일 | 설명 |
|------|------|
| `apps/medications/models.py` | `days_supply`, `start_date` 필드 추가 |
| `apps/medications/serializers.py` | `end_date` 직렬화 추가 |
| `apps/medications/views.py` | 캘린더 API에 `hospital_visits` 추가 |
| `apps/alerts/views.py` | `/alerts/send/` 엔드포인트 추가 |
| `apps/alerts/serializers.py` | `SendAlertSerializer` 추가 |

### Mobile (React Native)

| 파일 | 설명 |
|------|------|
| `app/(tabs)/calendar.tsx` | 복약 캘린더 화면 |
| `app/(tabs)/_layout.tsx` | 탭 순서 변경 (홈-내약-캘린더-설정) |
| `app/(tabs)/profile.tsx` | 알림 전송 UI 추가 |
| `app/medications/add.tsx` | 처방 일수 입력 필드 추가 |
| `app/medications/scan.tsx` | 처방 일수 입력 + start_date 자동 설정 |
| `services/api.ts` | 캘린더 API, 알림 전송 API 추가 |
| `services/types.ts` | `CalendarData`, `HospitalVisit` 타입 추가 |

---

## 5. 마이그레이션

```bash
# 새 필드 마이그레이션
cd backend
python manage.py makemigrations medications
python manage.py migrate
```

마이그레이션 파일:
- `0004_medication_days_supply_medication_start_date.py`
