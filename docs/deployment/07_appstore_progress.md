# 앱스토어 제출 진행 상황

> 최종 업데이트: 2026-01-26

---

## 🎉 App Store 심사 제출 완료!

**제출일**: 2026-01-26
**상태**: 심사 대기 중 (Waiting for Review)

---

## ✅ 완료된 작업

### 1. 법적 문서 작성 및 구현 ✅

#### 생성된 파일
- ✅ `backend/apps/users/templates/terms.html` - 이용약관
- ✅ `backend/apps/users/templates/privacy.html` - 개인정보 처리방침

#### 백엔드 구현
- ✅ `backend/apps/users/views.py` - TemplateView 추가 (TermsView, PrivacyView)
- ✅ `backend/apps/users/urls.py` - URL 라우팅 추가 (/terms/, /privacy/)

#### 모바일 앱 연동
- ✅ `mobile/app/(tabs)/profile.tsx` - 이용약관/개인정보 링크 연결
- ✅ Linking 모듈 import 추가
- ✅ 버튼 클릭 시 웹 브라우저로 열기 구현

**접속 URL**:
- https://yaksok-care.com/terms/
- https://yaksok-care.com/privacy/

---

### 2. TestFlight 로그인 문제 해결 ✅

**문제**: TestFlight 앱에서 로그인/회원가입 실패 (401 Unauthorized)

**원인**:
1. Docker `expose` vs `ports` 설정 문제
2. JWT 인증이 공개 엔드포인트에서도 실행됨

**해결**:
1. `docker-compose.prod.yml`에서 `expose` → `ports` 변경
2. `backend/apps/users/views.py`에서 `authentication_classes = []` 추가

**상세 문서**: [09_testflight_login_troubleshooting.md](./09_testflight_login_troubleshooting.md)

---

### 3. Production 빌드 ✅

```bash
cd mobile
npx eas build --platform ios --profile production
```

- ✅ EAS Build 완료
- ✅ Provisioning Profile 생성
- ✅ App Store Connect에 빌드 업로드

---

### 4. App Store Connect 설정 완료 ✅

#### 4.1 기본 정보
- ✅ 앱 이름: 약속 (Yak-Sok)
- ✅ 부제목: 시니어 복약 관리 및 보호자 연결
- ✅ 카테고리: 건강 및 피트니스
- ✅ 연령 등급: 4+

#### 4.2 URL
- ✅ 개인정보 처리방침: https://yaksok-care.com/privacy/
- ✅ 이용약관: https://yaksok-care.com/terms/

#### 4.3 스크린샷
- ✅ iPhone 6.7인치 스크린샷 업로드
- ✅ iPhone 6.5인치 스크린샷 업로드
- ✅ iPhone 5.5인치 스크린샷 업로드
- ✅ iPad Pro 12.9인치 스크린샷 업로드

#### 4.4 App Privacy (데이터 수집 공개)

| 데이터 유형 | 사용 목적 | 사용자 연결 | 추적 사용 |
|------------|----------|------------|----------|
| 이름 | 앱 기능 | 예 | 아니요 |
| 이메일 주소 | 앱 기능 | 예 | 아니요 |
| 건강 | 앱 기능 | 예 | 아니요 |
| 사진/비디오 | 앱 기능 | 예 | 아니요 |
| 사용자 ID | 앱 기능 | 예 | 아니요 |
| 기기 ID | 앱 기능 | 예 | 아니요 |
| 충돌 데이터 | 앱 기능 | 아니요 | 아니요 |

#### 4.5 심사 정보
- ✅ 테스트 계정 정보 입력
  - 시니어: senior@test.com / <테스트 비밀번호>
  - 보호자: guardian@test.com / <테스트 비밀번호>
- ✅ 심사 노트 작성

> 실제 비밀번호는 `docs/SENSITIVE_INFO.md` 참고

---

## 📋 심사 진행 상황

### 예상 일정

```
2026-01-26 ✅ 심사 제출
    ↓
2026-01-26 ~ 01-28 ⏳ 심사 대기 (Waiting for Review)
    ↓
2026-01-28 ~ 01-30 ⏳ 심사 중 (In Review)
    ↓
2026-01-30 ~ 02-01 🎯 승인 예상 (Ready for Sale)
```

**참고**: Apple 심사는 보통 1-3일 소요됩니다. 첫 제출이거나 건강 데이터를 다루는 앱은 더 오래 걸릴 수 있습니다.

---

## 🚨 트러블슈팅 기록

### 1. TestFlight 로그인 실패 (2026-01-26)

**증상**:
- curl 테스트 성공, 앱에서만 401 에러
- 로그에 요청 도달하지 않음

**원인**:
- `authentication_classes`가 전역 설정되어 로그인/회원가입에서도 JWT 검증
- 앱에 저장된 만료된 토큰이 모든 요청에 첨부됨

**해결**:
```python
# backend/apps/users/views.py
class LoginView(APIView):
    authentication_classes = []  # JWT 인증 비활성화
    permission_classes = [permissions.AllowAny]
```

**핵심 교훈**:
- `permission_classes = [AllowAny]`만으로는 불충분
- `authentication_classes = []`를 명시적으로 추가해야 함

---

### 2. Docker ContainerConfig 오류 (2026-01-26)

**증상**:
```
ERROR: for backend  'ContainerConfig'
KeyError: 'ContainerConfig'
```

**원인**: docker-compose 1.29.2 버전 버그

**해결**:
```bash
docker rm -f $(docker ps -a | grep backend | awk '{print $1}') 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d backend
```

---

## 📚 관련 문서

| 문서 | 설명 |
|------|------|
| [05_appstore_metadata.md](./05_appstore_metadata.md) | 앱스토어 메타데이터 템플릿 |
| [06_appstore_submission_guide.md](./06_appstore_submission_guide.md) | 제출 상세 가이드 |
| [08_terms_privacy_troubleshooting.md](./08_terms_privacy_troubleshooting.md) | 법적 문서 트러블슈팅 |
| [09_testflight_login_troubleshooting.md](./09_testflight_login_troubleshooting.md) | 로그인 문제 트러블슈팅 |

---

## 🔧 수정된 파일 목록

### 백엔드
- `backend/apps/users/views.py` - `authentication_classes = []` 추가
- `docker-compose.prod.yml` - `expose` → `ports` 변경

### 문서
- `docs/deployment/09_testflight_login_troubleshooting.md` - 신규 생성

---

## ⏭️ 다음 단계

### 심사 승인 시
1. App Store에서 "약속" 검색 가능 확인
2. 실제 기기에서 다운로드 및 테스트
3. 사용자 피드백 수집

### 심사 거부 시
1. 거부 사유 확인
2. 문제 해결
3. 재제출

### 업데이트 배포 시
1. 버전 번호 증가 (1.0.1, 1.1.0 등)
2. 새 빌드 업로드
3. 변경사항 작성 후 재제출

---

**작성일**: 2026-01-25
**최종 수정**: 2026-01-26
**상태**: ✅ App Store 심사 제출 완료
