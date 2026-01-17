# 📋 개발 진행 현황

> 최종 업데이트: 2026-01-17

## 진행 상태 요약

| 단계 | 상태 | 완료일 |
|------|------|--------|
| 1. 프로젝트 설계 | ✅ 완료 | 2026-01-09 |
| 2. 백엔드 구조 구축 | ✅ 완료 | 2026-01-09 |
| 3. 프론트엔드 구조 구축 | ✅ 완료 | 2026-01-09 |
| 4. 인프라 설정 | ✅ 완료 | 2026-01-09 |
| 5. 개발 환경 로컬 테스트 | ✅ 완료 | 2026-01-09 |
| 6. UI/UX 디자인 시스템 | ✅ 완료 | 2026-01-09 |
| 7. API 연동 및 테스트 | ✅ 완료 | 2026-01-11 |
| 8. OCR/STT 기능 구현 | ✅ 완료 | 2026-01-11 |
| 9. 푸시 알림 연동 | ✅ 완료 | 2026-01-11 |
| 10. 복약 캘린더 기능 | ✅ 완료 | 2026-01-17 |
| 11. 사용자 간 알림 전송 | ✅ 완료 | 2026-01-17 |
| 12. 역할 구조 개편 | ✅ 완료 | 2026-01-17 |
| 13. 테스트 및 QA | 🔄 진행중 | - |
| 14. 배포 | 🔲 예정 | - |

---

## 🎨 UI/UX 디자인 시스템 완료 (2026-01-09)

### 적용된 디자인 특징

- **파스텔 뉴모피즘**: 부드러운 그림자와 파스텔 톤 색상
- **동적 레이아웃**: `clamp()` 기반 반응형 여백
- **시니어 친화적**: 큰 폰트(17.6px+)와 넓은 터치 영역(52px+)
- **유기적 배경**: 그라데이션 배경 효과

### 업데이트된 페이지

| 페이지 | 상태 |
|--------|------|
| 홈 | ✅ |
| 로그인 | ✅ |
| 약 목록 | ✅ |
| 약 추가 | ✅ |
| 처방전 스캔 | ✅ |
| 프로필 | ✅ |
| 알림 | ✅ |
| 보호자 대시보드 | ✅ |
| **복약 캘린더** | ✅ NEW |

---

## 📅 복약 캘린더 기능 (2026-01-17)

### 주요 기능

- **월별 복약 현황 시각화**: 캘린더에 복약 완료/일부/미복용 상태 표시
- **병원 방문일 자동 계산**: 처방 일수 기반으로 약 떨어지는 날 표시
- **일괄 수정 기능**: 같은 날짜의 여러 약을 한 번에 수정

### 캘린더 마커 색상

| 색상 | 의미 |
|------|------|
| 🟢 초록 | 복약 완료 |
| 🟡 노랑 | 일부 복용 |
| 🔴 빨강 | 미복용 |
| 🔵 파랑 | 병원 방문일 |

### 관련 파일

- `mobile/app/(tabs)/calendar.tsx` - 캘린더 화면
- `backend/apps/medications/models.py` - `days_supply`, `start_date` 필드
- `backend/apps/medications/views.py` - 캘린더 API

---

## 💬 사용자 간 알림 전송 기능 (2026-01-17)

### 주요 기능

- **보호자 → 복약자/시니어**: 안부 확인, 약 드셨나요?
- **복약자/시니어 → 보호자**: 괜찮아요, 도움 필요해요
- **연결된 사용자 확인**: GuardianRelation 기반 권한 검증

### API 엔드포인트

```
POST /api/alerts/send/
{
    "recipient_id": 1,
    "message_type": "check_in" | "reminder" | "im_ok" | "need_help" | "custom",
    "custom_message": "직접 입력 메시지 (optional)"
}
```

### 관련 파일

- `backend/apps/alerts/views.py` - 알림 전송 API
- `backend/apps/alerts/serializers.py` - SendAlertSerializer
- `mobile/app/(tabs)/profile.tsx` - 알림 전송 UI

---

## 👥 역할 구조 개편 (2026-01-17)

### 3가지 사용자 역할

| 역할 | 설명 | 탭 구성 |
|------|------|---------|
| **복약자** | 자신의 약만 관리 | 홈, 내 약, 캘린더, 설정 (4탭) |
| **시니어** | 약 관리 + 보호자 연결 | 홈, 내 약, 캘린더, 설정 (4탭) |
| **보호자** | 연결된 사용자 모니터링 | 시니어관리, 시니어캘린더, 설정 (3탭) |

### 연결 규칙

- 복약자/시니어 ↔ 보호자 연결 가능
- 같은 역할끼리는 연결 불가

### 보호자 전용 화면

- **시니어 관리**: 연결된 복약자/시니어의 오늘 복약 현황
- **시니어 캘린더**: 연결된 복약자/시니어의 월별 복약 기록

### 관련 파일

- `backend/apps/users/models.py` - User.Role 정의
- `mobile/app/(auth)/register.tsx` - 3개 역할 선택 UI
- `mobile/components/CustomTabBar.tsx` - 역할별 탭 필터링
- `mobile/app/(tabs)/seniors.tsx` - 시니어 관리 화면
- `mobile/app/(tabs)/senior-calendar.tsx` - 시니어 캘린더 화면

---

## 🖥️ 개발 환경 설정 완료 (2026-01-09)

### 로컬 서버 실행 현황

| 서비스 | URL | 상태 |
|--------|-----|------|
| **프론트엔드 (Next.js)** | `http://localhost:3000` | ✅ 정상 |
| **백엔드 (Django)** | `http://127.0.0.1:8000` | ✅ 정상 |
| **Django Admin** | `http://127.0.0.1:8000/admin/` | ✅ 접속 가능 |
| **PostgreSQL** | `localhost:5432` / DB: `yaksok` | ✅ 연결됨 |

### 로컬 실행 명령어

```bash
# 프론트엔드 (새 터미널)
cd frontend
npm run dev

# 백엔드 (새 터미널)
cd backend
python manage.py runserver
```

---

## 문서 목록

- [01_project_structure.md](./01_project_structure.md) - 프로젝트 구조 및 아키텍처
- [02_backend_development.md](./02_backend_development.md) - 백엔드 개발 상세
- [03_frontend_development.md](./03_frontend_development.md) - 프론트엔드 개발 상세
- [04_api_specification.md](./04_api_specification.md) - API 명세
- [05_deployment_guide.md](./05_deployment_guide.md) - 배포 가이드
- [06_ui_design_system.md](./06_ui_design_system.md) - UI/UX 디자인 시스템
- [08_calendar_feature.md](./08_calendar_feature.md) - 복약 캘린더 기능
- [09_notification_system.md](./09_notification_system.md) - 사용자 연결 및 알림 시스템
- [10_role_structure.md](./10_role_structure.md) - **역할 구조** ⭐ NEW

---

## 다음 단계

1. **테스트 코드 작성**: 유닛/통합 테스트
2. **성능 최적화**: API 응답 속도 개선
3. **배포 준비**: Docker 이미지 최적화, CI/CD 파이프라인 구축
4. **앱 스토어 배포**: iOS/Android 앱 빌드 및 배포

