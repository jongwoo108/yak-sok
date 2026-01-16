#!/bin/bash
# ===========================================
# Yak-Sok 배포 스크립트
# 프로덕션 서버에서 실행
# ===========================================

set -e

echo "🚀 Yak-Sok 배포 시작..."

# 1. 환경 변수 확인
if [ ! -f .env ]; then
    echo "❌ .env 파일이 없습니다. .env.example을 복사하여 설정해주세요."
    echo "   cp .env.example .env"
    exit 1
fi

# 2. 필수 환경 변수 검증
source .env
if [ "$DJANGO_SECRET_KEY" == "your-very-secure-secret-key-here-change-this" ]; then
    echo "❌ DJANGO_SECRET_KEY를 변경해주세요!"
    exit 1
fi

if [ "$DJANGO_DEBUG" != "False" ]; then
    echo "⚠️  경고: DJANGO_DEBUG가 False가 아닙니다. 프로덕션에서는 False로 설정하세요."
fi

echo "✅ 환경 변수 확인 완료"

# 3. SSL 인증서 초기화 (첫 배포 시)
if [ ! -d "certbot/conf/live" ]; then
    echo "📜 SSL 인증서 초기 설정 중..."
    
    # 임시 자체 서명 인증서 생성
    mkdir -p certbot/conf/live/your-domain.com
    openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
        -keyout certbot/conf/live/your-domain.com/privkey.pem \
        -out certbot/conf/live/your-domain.com/fullchain.pem \
        -subj '/CN=localhost' 2>/dev/null
    
    echo "⚠️  임시 인증서가 생성되었습니다. 배포 후 Let's Encrypt로 교체하세요."
fi

# 4. Docker 이미지 빌드 및 실행
echo "🐳 Docker 컨테이너 빌드 중..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 컨테이너 시작 중..."
docker-compose -f docker-compose.prod.yml up -d

# 5. 헬스 체크
echo "⏳ 서비스 시작 대기 중..."
sleep 10

# 백엔드 헬스 체크
if curl -s http://localhost:8000/api/ > /dev/null; then
    echo "✅ 백엔드 정상 작동 중"
else
    echo "❌ 백엔드 응답 없음"
    docker-compose -f docker-compose.prod.yml logs backend
fi

# 6. Let's Encrypt 인증서 발급 (선택적)
echo ""
echo "=========================================="
echo "📜 SSL 인증서 발급하려면 다음 명령어 실행:"
echo "   docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot -w /var/www/certbot -d your-domain.com -d www.your-domain.com"
echo "   docker-compose -f docker-compose.prod.yml restart nginx"
echo "=========================================="

echo ""
echo "✅ 배포 완료!"
echo "   서비스 상태: docker-compose -f docker-compose.prod.yml ps"
echo "   로그 확인: docker-compose -f docker-compose.prod.yml logs -f"
