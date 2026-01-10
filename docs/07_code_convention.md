# 07. 코드 컨벤션 및 협업 가이드

> 작성일: 2026-01-10

## Git 브랜치 전략

### 브랜치 구조

```
main (production)
  └── develop (개발 통합)
        ├── feature/xxx (기능 개발)
        ├── fix/xxx (버그 수정)
        ├── refactor/xxx (리팩토링)
        └── docs/xxx (문서 작업)
```

### 브랜치 네이밍 규칙

| 유형 | 형식 | 예시 |
|------|------|------|
| 기능 개발 | `feature/기능명` | `feature/medication-grouping` |
| 버그 수정 | `fix/버그설명` | `fix/ocr-trailing-slash` |
| 리팩토링 | `refactor/대상` | `refactor/api-endpoints` |
| 문서 | `docs/문서명` | `docs/rag-implementation` |
| 긴급 수정 | `hotfix/설명` | `hotfix/login-error` |

---

## 커밋 메시지 컨벤션

### 형식
```
<type>(<scope>): <subject>

[body]

[footer]
```

### 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 | `feat(medications): add group batch taking` |
| `fix` | 버그 수정 | `fix(api): add trailing slash to endpoints` |
| `docs` | 문서 수정 | `docs: add RAG implementation plan` |
| `style` | 코드 포맷팅 | `style: fix indentation` |
| `refactor` | 리팩토링 | `refactor(ocr): extract service class` |
| `test` | 테스트 추가 | `test: add medication API tests` |
| `chore` | 빌드/설정 변경 | `chore: update requirements.txt` |

### 규칙
- subject는 50자 이내
- 한글/영문 모두 허용
- 명령형 현재시제 사용 (Add, Fix, Update)

---

## PR (Pull Request) 가이드

### PR 제목
```
[타입] 간단한 설명
```
예: `[Feature] 약품 그룹 기능 구현`

### PR 템플릿
```markdown
## 개요
변경 사항에 대한 간단한 설명

## 변경 내용
- 변경 1
- 변경 2

## 테스트
- [ ] 로컬 테스트 완료
- [ ] API 동작 확인

## 스크린샷 (UI 변경 시)
```

---

## 코드 스타일

### Python (Backend)
- **PEP 8** 준수
- 들여쓰기: 4 spaces
- 최대 줄 길이: 88 (Black formatter)
- 따옴표: 작은따옴표 `'` 우선

```python
# Good
def get_medications(user_id: int) -> list[Medication]:
    """사용자의 약품 목록 조회"""
    return Medication.objects.filter(user_id=user_id)

# Bad
def getMedications(userId):
    return Medication.objects.filter(user_id=userId)
```

### TypeScript/React (Frontend)
- 들여쓰기: 4 spaces
- 따옴표: 작은따옴표 `'`
- 세미콜론: 사용
- 컴포넌트: PascalCase
- 함수/변수: camelCase

```typescript
// Good
const MedicationCard = ({ medication }: Props) => {
    const handleTake = async () => {
        await api.logs.take(medication.id);
    };
    return <div>...</div>;
};

// Bad
function medication_card({ medication }) {
    // ...
}
```

---

## 폴더 구조 규칙

### Backend
```
apps/
  └── [앱이름]/
        ├── models.py       # 데이터 모델
        ├── serializers.py  # API 직렬화
        ├── views.py        # API 뷰
        ├── urls.py         # URL 라우팅
        ├── services.py     # 비즈니스 로직
        ├── tasks.py        # Celery 태스크
        └── admin.py        # 관리자 설정
```

### Frontend
```
src/
  ├── app/              # Next.js App Router
  ├── components/       # 재사용 컴포넌트
  ├── services/         # API, Store
  └── styles/           # 글로벌 스타일
```

---

## 워크플로우 예시

```bash
# 1. develop에서 feature 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/medication-grouping

# 2. 개발 및 커밋
git add .
git commit -m "feat(medications): add MedicationGroup model"

# 3. 푸시 및 PR 생성
git push origin feature/medication-grouping
# GitHub에서 PR 생성: feature/medication-grouping → develop

# 4. 코드 리뷰 후 Merge
# 5. feature 브랜치 삭제
git branch -d feature/medication-grouping
```
