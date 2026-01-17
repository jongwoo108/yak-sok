# CI/CD 파이프라인 설정

> 작성일: 2026-01-18

## 📋 개요

GitHub Actions를 사용한 자동 배포 파이프라인 설정 가이드입니다.

---

## 🔄 배포 플로우

```
PR 생성 → 테스트 실행 → main 병합 → 자동 배포
```

---

## 🔐 GitHub Secrets 설정

Repository → Settings → Secrets and variables → Actions

| Secret 이름 | 값 |
|------------|-----|
| `LIGHTSAIL_HOST` | 인스턴스 고정 IP |
| `SSH_PRIVATE_KEY` | SSH 키 전체 내용 |
| `AWS_ACCESS_KEY_ID` | yaksok-cicd Access Key |
| `AWS_SECRET_ACCESS_KEY` | yaksok-cicd Secret Key |

---

## 📝 Workflow 파일

### 1. 테스트 (PR 시)

```yaml
# .github/workflows/test.yml
name: Test

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run tests
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db
          DJANGO_SECRET_KEY: test-secret-key
        run: |
          cd backend
          python manage.py test
```

### 2. 배포 (main 푸시 시)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Lightsail
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.LIGHTSAIL_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app/yak-sok
            git pull origin main
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d --build
            docker system prune -f
      
      - name: Health Check
        run: |
          sleep 30
          curl -f https://${{ secrets.LIGHTSAIL_HOST }}/api/ || exit 1
```

---

## 🚀 설정 단계

### 1. SSH 키 준비

```bash
# Lightsail에서 다운로드한 키 내용 복사
cat LightsailDefaultKey-ap-northeast-2.pem
```

### 2. GitHub Secrets 등록

1. Repository → Settings → Secrets
2. **New repository secret** 클릭
3. 위 표의 모든 시크릿 등록

### 3. Workflow 파일 생성

```bash
mkdir -p .github/workflows
# 위 내용으로 test.yml, deploy.yml 생성
```

### 4. 테스트

```bash
git add .github/workflows/
git commit -m "Add CI/CD workflows"
git push origin main
```

---

## 📊 배포 모니터링

### GitHub Actions 확인
- Repository → Actions 탭에서 워크플로우 실행 상태 확인

### 배포 실패 시
1. Actions 로그 확인
2. SSH로 서버 접속하여 Docker 로그 확인
3. 수동 롤백: 이전 커밋으로 git reset

---

## 🔧 트러블슈팅

### SSH 연결 실패
- SSH 키 형식 확인 (-----BEGIN 포함 전체)
- Lightsail 방화벽에서 22번 포트 열려있는지 확인

### Docker 빌드 실패
- 서버 메모리 확인 (`free -h`)
- 오래된 이미지 정리 (`docker system prune -a`)
