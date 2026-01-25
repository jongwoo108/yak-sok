# 이용약관/개인정보 처리방침 페이지 트러블슈팅

> 작성일: 2026-01-25

---

## 문제 상황

### 증상
- `https://yaksok-care.com/api/users/terms/` 접속 시 인증 오류 발생
- `{"detail":"자격 인증 데이터가 제공되지 않았습니다."}`
- App Store 제출을 위해 법적 문서 페이지가 공개적으로 접근 가능해야 함

### 원인 분석

1. **DRF 전역 인증 설정 문제**
   - `settings.py`의 `DEFAULT_PERMISSION_CLASSES`가 `IsAuthenticated`로 설정됨
   - `/api/` 경로 하위의 모든 요청에 인증이 적용됨

2. **템플릿 파일 누락**
   - `backend/apps/users/templates/` 폴더가 git에 커밋되지 않음
   - Docker 컨테이너에 템플릿 파일이 존재하지 않음

3. **URL 라우팅 문제**
   - `/api/users/terms/` 경로가 DRF 인증을 우회하지 못함

---

## 해결 방안

### 1단계: URL을 API 경로 외부로 이동

**변경 전** (문제 발생):
```
https://yaksok-care.com/api/users/terms/
https://yaksok-care.com/api/users/privacy/
```

**변경 후** (해결):
```
https://yaksok-care.com/terms/
https://yaksok-care.com/privacy/
```

**파일 수정**: `backend/core/urls.py`
```python
from django.shortcuts import render

# 법적 문서 페이지 (인증 불필요)
def terms_view(request):
    return render(request, 'terms.html')

def privacy_view(request):
    return render(request, 'privacy.html')

urlpatterns = [
    path('admin/', admin.site.urls),

    # 법적 문서 (DRF 인증 우회)
    path('terms/', terms_view, name='terms'),
    path('privacy/', privacy_view, name='privacy'),

    # ... 기존 API 경로들
]
```

### 2단계: 템플릿 파일 커밋

템플릿 파일 위치:
- `backend/apps/users/templates/terms.html`
- `backend/apps/users/templates/privacy.html`

```bash
git add backend/apps/users/templates/
git commit -m "Add terms and privacy HTML templates"
git push origin main
```

### 3단계: 서버 배포

```bash
# 서버 SSH 접속
ssh -i ~/.ssh/LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.142.149

cd /app/yak-sok
git fetch origin
git reset --hard origin/main
docker-compose -f docker-compose.prod.yml restart backend

# 확인
curl https://yaksok-care.com/terms/
curl https://yaksok-care.com/privacy/
```

---

## 현재 상태

### 완료된 작업
- [x] `core/urls.py`에 terms/privacy 라우트 추가
- [x] 서버에 코드 배포 완료

### 미완료 작업
- [ ] 템플릿 파일(`templates/terms.html`, `templates/privacy.html`)이 컨테이너에 없음
- [ ] 템플릿 파일을 git에 커밋/푸시 필요
- [ ] Docker 컨테이너 재시작 또는 재빌드 필요

---

## 확인 방법

### 1. 템플릿 파일 존재 확인 (로컬)
```bash
ls -la backend/apps/users/templates/
```

### 2. git 추적 확인
```bash
git ls-files backend/apps/users/templates/
```

### 3. 서버 파일 확인
```bash
docker exec <container_id> ls -la /app/apps/users/templates/
```

### 4. 페이지 접속 테스트
```bash
curl https://yaksok-care.com/terms/
curl https://yaksok-care.com/privacy/
```

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `backend/core/urls.py` | 메인 URL 라우팅 (terms/privacy 추가됨) |
| `backend/apps/users/templates/terms.html` | 이용약관 HTML |
| `backend/apps/users/templates/privacy.html` | 개인정보 처리방침 HTML |
| `mobile/app/(tabs)/profile.tsx` | 모바일 앱 링크 (URL 수정됨) |

---

## 모바일 앱 URL 변경

`mobile/app/(tabs)/profile.tsx`에서 URL 업데이트:

**변경 전**:
```javascript
const url = 'https://yaksok-care.com/api/users/terms/';
const url = 'https://yaksok-care.com/api/users/privacy/';
```

**변경 후**:
```javascript
const url = 'https://yaksok-care.com/terms/';
const url = 'https://yaksok-care.com/privacy/';
```

---

## 다음 단계

1. 템플릿 파일이 git에 있는지 확인
2. 없으면 커밋/푸시
3. 서버에서 pull 후 컨테이너 재시작
4. 페이지 정상 접속 확인
5. App Store Connect에서 URL 입력

---

**최종 업데이트**: 2026-01-25
