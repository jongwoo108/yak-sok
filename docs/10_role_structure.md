# 10. 사용자 역할 구조

> 작성일: 2026-01-17

## 개요

약속 앱은 세 가지 사용자 역할을 지원합니다. 각 역할에 따라 앱의 탭 구성과 기능이 달라집니다.

---

## 1. 역할 정의

| 역할 | 코드 | 설명 | 약 관리 | 보호자 연결 |
|------|------|------|---------|-------------|
| **복약자** | `patient` | 자신의 약만 관리하는 일반 사용자 | O | 선택적 |
| **시니어** | `senior` | 약 관리 + 보호자 모니터링 받음 | O | 선택적 |
| **보호자** | `guardian` | 연결된 복약자/시니어 모니터링 | X | 복약자/시니어와 연결 |

### 역할 간 차이점

- **복약자 vs 시니어**: 기능적으로 동일 (둘 다 보호자와 연결 가능)
- **보호자**: 자신의 약 관리 기능 없음, 연결된 사용자 모니터링 전용

---

## 2. 탭 구성

### 복약자/시니어 (4탭)

```
┌─────┬─────┬─────┬─────┐
│ 홈  │내 약│캘린더│설정 │
└─────┴─────┴─────┴─────┘
```

| 탭 | 기능 |
|----|------|
| 홈 | 오늘의 복약 현황 |
| 내 약 | 약 목록 관리, 추가/수정 |
| 캘린더 | 복약 기록, 병원 방문일 |
| 설정 | 프로필, 연결 관리, 알림 설정 |

### 보호자 (3탭)

```
┌─────────┬─────────┬─────┐
│시니어   │시니어   │설정 │
│관리     │캘린더   │     │
└─────────┴─────────┴─────┘
```

| 탭 | 기능 |
|----|------|
| 시니어 관리 | 연결된 복약자/시니어의 오늘 복약 현황, 약 목록 |
| 시니어 캘린더 | 연결된 복약자/시니어의 월별 복약 기록 |
| 설정 | 프로필, 연결 관리, 알림 설정 |

---

## 3. 데이터 모델

### User 모델

```python
# backend/apps/users/models.py

class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = 'patient', '복약자'      # 자신의 약만 관리
        SENIOR = 'senior', '시니어'        # 약 관리 + 보호자 모니터링
        GUARDIAN = 'guardian', '보호자'    # 시니어 모니터링만
    
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.PATIENT,  # 기본값: 복약자
        verbose_name='역할'
    )
```

### GuardianRelation 모델

```python
# backend/apps/users/models.py

class GuardianRelation(models.Model):
    """복약자/시니어 - 보호자 연결 관계"""
    
    senior = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='guardians',
        verbose_name='복약자/시니어'  # patient 또는 senior 역할
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
| 시니어 | 보호자 | O 연결 성공 |
| 보호자 | 복약자 | O 연결 성공 |
| 보호자 | 시니어 | O 연결 성공 |

### 거부되는 연결

| 초대자 | 수락자 | 결과 |
|--------|--------|------|
| 복약자 | 복약자 | X 에러 |
| 시니어 | 시니어 | X 에러 |
| 보호자 | 보호자 | X 에러 |
| 복약자 | 시니어 | X 에러 |

**에러 메시지**: `"복약자/시니어와 보호자만 연결할 수 있습니다."`

---

## 5. 회원가입 화면

```
┌─────────────────────────────────────┐
│  어떤 유형의 사용자인가요?          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │   💊   │ │   👤   │ │   👥   ││
│  │ 복약자  │ │ 시니어  │ │ 보호자  ││
│  │         │ │         │ │         ││
│  │ 나의 약 │ │ 보호자  │ │ 시니어  ││
│  │ 관리    │ │  연결   │ │  관리   ││
│  └─────────┘ └─────────┘ └─────────┘│
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
| `app/(auth)/register.tsx` | 3개 역할 선택 UI |
| `app/(tabs)/_layout.tsx` | 탭 정의 |
| `components/CustomTabBar.tsx` | 역할별 탭 필터링 |
| `app/(tabs)/profile.tsx` | 설정 화면 |
| `app/(tabs)/seniors.tsx` | 보호자용 시니어 관리 |
| `app/(tabs)/senior-calendar.tsx` | 보호자용 시니어 캘린더 |
| `services/types.ts` | `User.role` 타입 |

---

## 7. 마이그레이션

```bash
cd backend
python manage.py makemigrations users --name add_patient_role
python manage.py migrate
```

마이그레이션 파일: `users/0005_add_patient_role.py`
