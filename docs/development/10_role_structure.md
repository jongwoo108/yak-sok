# 10. 사용자 역할 구조

> 작성일: 2026-01-17
> 최종 수정: 2026-02-23 (v1.1.6 — 복약자/시니어 통합)

## 개요

약속 앱은 **두 가지** 사용자 역할을 지원합니다. 각 역할에 따라 앱의 탭 구성과 기능이 달라집니다.

> ⚠️ v1.1.6 이전에는 복약자/시니어/보호자 3역할이었으나, 복약자와 시니어가 기능적으로 동일하여 통합되었습니다.

---

## 1. 역할 정의

| 역할 | 코드 | 설명 | 약 관리 | 보호자 연결 |
|------|------|------|---------|-------------|
| **복약자** | `patient` | 약 관리 + 보호자와 연결 가능 | O | O |
| **보호자** | `guardian` | 연결된 복약자 모니터링 | X | 복약자와 연결 |

---

## 2. 탭 구성

### 복약자 (4탭)

```
┌──────┬─────┬─────┬─────┐
│건강  │내 약│캘린더│설정 │
│피드  │    │     │     │
└──────┴─────┴─────┴─────┘
```

| 탭 | 기능 |
|----|------|
| 건강피드 | AI 기반 맞춤 건강 영상 추천 |
| 내 약 | 오늘의 복약 현황, 복용 체크 |
| 캘린더 | 복약 기록, 병원 방문일 |
| 설정 | 프로필, 연결 관리, 알림 설정 |

### 보호자 (3탭)

```
┌─────────┬─────────┬─────┐
│복약자   │복약자   │설정 │
│관리     │캘린더   │     │
└─────────┴─────────┴─────┘
```

| 탭 | 기능 |
|----|------|
| 복약자 관리 | 연결된 복약자의 오늘 복약 현황, 약 목록 |
| 복약자 캘린더 | 연결된 복약자의 월별 복약 기록 |
| 설정 | 프로필, 연결 관리, 알림 설정 |

---

## 3. 데이터 모델

### User 모델

```python
# backend/apps/users/models.py

class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = 'patient', '복약자'      # 약 관리 + 보호자 연결 가능
        GUARDIAN = 'guardian', '보호자'    # 사용자 모니터링

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.PATIENT,
        verbose_name='역할'
    )
```

### GuardianRelation 모델

```python
# backend/apps/users/models.py

class GuardianRelation(models.Model):
    """복약자 - 보호자 연결 관계"""

    senior = models.ForeignKey(     # FK 필드명은 호환성을 위해 'senior' 유지
        User,
        on_delete=models.CASCADE,
        related_name='guardians',
        limit_choices_to={'role__in': ['patient']},
        verbose_name='사용자'
    )
    guardian = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='seniors',
        limit_choices_to={'role': User.Role.GUARDIAN},
        verbose_name='보호자'
    )
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## 4. 연결 규칙

### 허용되는 연결

| 초대자 | 수락자 | 결과 |
|--------|--------|------|
| 복약자 | 보호자 | O 연결 성공 |
| 보호자 | 복약자 | O 연결 성공 |

### 거부되는 연결

| 초대자 | 수락자 | 결과 |
|--------|--------|------|
| 복약자 | 복약자 | X 에러 |
| 보호자 | 보호자 | X 에러 |

**에러 메시지**: `"복약자와 보호자만 연결할 수 있습니다."`

---

## 5. 회원가입 화면

```
┌─────────────────────────────────────┐
│  어떤 유형의 사용자인가요?          │
│  ┌───────────────┐ ┌───────────────┐│
│  │      💊      │ │      👥      ││
│  │   복약자      │ │   보호자      ││
│  │              │ │              ││
│  │  나의 약 관리 │ │  복약자 관리  ││
│  └───────────────┘ └───────────────┘│
└─────────────────────────────────────┘
```

---

## 6. 관련 파일

### Backend

| 파일 | 설명 |
|------|------|
| `apps/users/models.py` | `User.Role` 정의, `GuardianRelation` |
| `apps/users/views.py` | `AcceptInviteView` 연결 규칙 |
| `apps/users/serializers.py` | `UserSerializer` role 필드 |

### Mobile

| 파일 | 설명 |
|------|------|
| `app/(auth)/register.tsx` | 2개 역할 선택 UI |
| `app/(tabs)/_layout.tsx` | 탭 정의 |
| `components/CustomTabBar.tsx` | 역할별 탭 필터링 |
| `app/(tabs)/profile.tsx` | 설정 화면 |
| `app/(tabs)/seniors.tsx` | 보호자용 복약자 관리 |
| `app/(tabs)/senior-calendar.tsx` | 보호자용 복약자 캘린더 |
| `services/types.ts` | `User.role` 타입 |

---

## 7. 마이그레이션 이력

| 마이그레이션 | 설명 |
|---|---|
| `0005_add_patient_role.py` | patient 역할 추가 (2026-01-17) |
| `0006_merge_senior_into_patient.py` | senior → patient 통합 (2026-02-23) |
