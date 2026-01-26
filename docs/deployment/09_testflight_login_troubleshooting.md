# TestFlight 로그인/회원가입 실패 트러블슈팅

> 작성일: 2026-01-26

---

## 문제 상황

### 증상
- TestFlight 앱에서 로그인 및 회원가입 실패
- 앱에서 "로그인 실패 - 이메일 또는 비밀번호를 확인해주세요" 에러 표시
- curl 테스트는 정상 작동 (200 OK)
- 앱 요청은 401 Unauthorized 반환

### 로그 분석
```
# curl 테스트 (성공)
3.39.142.149 - POST /api/users/login/ HTTP/1.1" 200 724 "curl/7.81.0"

# 앱 테스트 (실패)
125.141.49.50 - POST /api/users/login/ HTTP/1.1" 401 205 "YakSok/8 CFNetwork/3860.300.31 Darwin/25.2.0"
```

---

## 원인 분석

### 1차 원인: Docker 포트 노출 문제

**문제**: `docker-compose.prod.yml`에서 `expose`를 사용하여 포트가 호스트에 노출되지 않음

```yaml
# 문제 발생 (호스트에서 접근 불가)
expose:
  - "8000"

# 해결 (호스트에 포트 매핑)
ports:
  - "8000:8000"
```

**증상**: 502 Bad Gateway (nginx가 backend에 연결 불가)

### 2차 원인: JWT 인증 문제 (핵심 원인)

**문제**: 앱에 저장된 오래된/잘못된 JWT 토큰이 모든 요청에 첨부됨

**동작 방식**:
1. 앱의 axios 인터셉터가 저장된 토큰을 모든 요청에 자동 첨부
2. DRF의 `DEFAULT_AUTHENTICATION_CLASSES`에 `JWTAuthentication` 설정됨
3. 로그인/회원가입 요청에도 잘못된 토큰이 첨부됨
4. JWT 인증이 뷰에 도달하기 전에 401 반환

**앱 코드** (`mobile/services/api.ts`):
```javascript
apiClient.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    }
);
```

**서버 설정** (`backend/core/settings.py`):
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}
```

---

## 해결 방안

### 1단계: Docker 포트 매핑 수정

**파일**: `docker-compose.prod.yml`

```yaml
backend:
  # ... 기타 설정 ...
  ports:
    - "8000:8000"  # expose 대신 ports 사용
```

### 2단계: 인증 엔드포인트에서 JWT 인증 비활성화

**파일**: `backend/apps/users/views.py`

```python
class RegisterView(generics.CreateAPIView):
    """회원가입 View"""
    queryset = User.objects.all()
    authentication_classes = []  # JWT 인증 비활성화
    permission_classes = [permissions.AllowAny]
    serializer_class = UserCreateSerializer


class LoginView(APIView):
    """이메일 로그인 View"""
    authentication_classes = []  # JWT 인증 비활성화
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # ... 로그인 로직 ...


class GoogleLoginView(APIView):
    """Google 로그인 View"""
    authentication_classes = []  # JWT 인증 비활성화
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # ... Google 로그인 로직 ...
```

**핵심**: `authentication_classes = []`를 추가하여 해당 뷰에서 JWT 인증을 완전히 건너뜀

### 3단계: 서버 배포

```bash
# 서버 SSH 접속 (실제 정보는 docs/SENSITIVE_INFO.md 참고)
ssh -i <SSH 키 경로> ubuntu@<서버 IP>

# 코드 업데이트
cd /app/yak-sok
git fetch origin && git reset --hard origin/main

# Docker 컨테이너 재생성
docker rm -f $(docker ps -a | grep backend | awk '{print $1}') 2>/dev/null || true
docker-compose -f docker-compose.prod.yml build backend
docker-compose -f docker-compose.prod.yml up -d backend

# 포트 매핑 확인
docker ps
# 0.0.0.0:8000->8000/tcp 표시되어야 함
```

---

## 디버깅 방법

### 1. Django 디버그 로깅 추가

```python
def post(self, request):
    print(f"[Login] Content-Type: {request.content_type}")
    print(f"[Login] Request data: {request.data}")
    # ... 나머지 로직 ...
```

### 2. 로그 확인

```bash
# Django 로그
docker logs -f yaksok-backend

# nginx 로그
sudo tail -f /var/log/nginx/access.log
```

### 3. curl 테스트

```bash
curl -X POST https://yaksok-care.com/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"senior@test.com","password":"<테스트 비밀번호>"}'
```

---

## Docker ContainerConfig 오류 해결

### 증상
```
ERROR: for backend  'ContainerConfig'
KeyError: 'ContainerConfig'
```

### 원인
docker-compose 1.29.2 버전의 알려진 버그. 컨테이너 재생성 시 발생.

### 해결
```bash
# 모든 backend 컨테이너 강제 삭제
docker rm -f $(docker ps -a | grep backend | awk '{print $1}') 2>/dev/null || true

# 새로 생성
docker-compose -f docker-compose.prod.yml up -d backend
```

---

## 테스트 계정

```
시니어 계정:
- 이메일: senior@test.com
- 비밀번호: <테스트 비밀번호>

보호자 계정:
- 이메일: guardian@test.com
- 비밀번호: <테스트 비밀번호>
```

> 실제 비밀번호는 `docs/SENSITIVE_INFO.md` 참고

### 테스트 계정 생성 방법

```bash
docker exec -it yaksok-backend python manage.py shell
```

```python
from django.contrib.auth import get_user_model
User = get_user_model()

# 시니어 계정
User.objects.create_user(
    username='senior@test.com',
    email='senior@test.com',
    password='<테스트 비밀번호>',
    first_name='테스트시니어',
    role='senior'
)

# 보호자 계정
User.objects.create_user(
    username='guardian@test.com',
    email='guardian@test.com',
    password='<테스트 비밀번호>',
    first_name='테스트보호자',
    role='guardian'
)
```

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `backend/apps/users/views.py` | 로그인/회원가입 뷰 (authentication_classes 추가) |
| `docker-compose.prod.yml` | Docker 설정 (ports 매핑) |
| `mobile/services/api.ts` | 앱 API 클라이언트 (토큰 자동 첨부) |
| `backend/core/settings.py` | DRF 기본 인증 설정 |

---

## 핵심 교훈

1. **`permission_classes = [AllowAny]`만으로는 충분하지 않음**
   - DRF의 authentication과 permission은 별개의 단계
   - authentication이 먼저 실행되고, 실패하면 permission 체크 전에 401 반환

2. **앱에 저장된 토큰 주의**
   - 로그아웃 후에도 앱에 토큰이 남아있을 수 있음
   - 인증이 필요 없는 엔드포인트에서는 `authentication_classes = []` 명시

3. **Docker expose vs ports**
   - `expose`: 같은 Docker 네트워크 내 컨테이너 간 통신만 가능
   - `ports`: 호스트에서도 접근 가능

---

**최종 업데이트**: 2026-01-26
