"""
Health Views - 건강 프로필, 영상 피드 API
"""

from datetime import datetime

from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q

from .models import (
    UserHealthProfile, HealthCondition, CachedVideo, VideoBookmark,
    LifestyleTip,
)
from .serializers import (
    UserHealthProfileSerializer,
    CachedVideoListSerializer,
    CachedVideoDetailSerializer,
    VideoBookmarkSerializer,
    LifestyleTipSerializer,
)
from apps.users.permissions import IsPremiumUser


class HealthProfileViewSet(viewsets.GenericViewSet):
    """
    건강 프로필 API
    GET  /api/health/profile/          - 내 건강 프로필 조회
    POST /api/health/profile/refresh/  - 질병 재분석 요청
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserHealthProfileSerializer
    
    def list(self, request):
        """내 건강 프로필 조회"""
        profile, created = UserHealthProfile.objects.get_or_create(
            user=request.user
        )
        serializer = UserHealthProfileSerializer(profile)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def refresh(self, request):
        """질병 재분석 요청 - GPT-4o로 즉시 분석"""
        from .tasks import refresh_user_health_profile
        
        # 비동기 태스크로 실행 (분석 + YouTube 검색)
        refresh_user_health_profile.delay(request.user.id)
        
        return Response({
            'status': '건강 프로필 분석이 시작되었습니다. 잠시 후 새로고침하세요.'
        })


class VideoFeedViewSet(viewsets.GenericViewSet,
                       mixins.ListModelMixin,
                       mixins.RetrieveModelMixin):
    """
    영상 피드 API
    GET /api/health/feed/              - 개인화 영상 피드 (페이지네이션)
    GET /api/health/feed/?category=diet - 카테고리 필터
    GET /api/health/feed/<id>/         - 영상 상세
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CachedVideoDetailSerializer
        return CachedVideoListSerializer
    
    def get_queryset(self):
        queryset = CachedVideo.objects.filter(is_active=True)
        
        # 카테고리 필터
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(content_category=category)
        
        # 개인화 필터 - 사용자 건강 프로필의 질병에 맞는 영상
        try:
            profile = self.request.user.health_profile
            if profile.conditions:
                condition_names = [c.get('name', '') for c in profile.conditions]
                # 사용자 질병 관련 영상만 (질병이 설정된 경우)
                queryset = queryset.filter(
                    Q(conditions__name__in=condition_names)
                ).distinct()
        except UserHealthProfile.DoesNotExist:
            # 프로필 없으면 전체 영상 반환
            pass
        
        return queryset.order_by('-is_from_trusted_channel', '-published_at')


class VideoBookmarkViewSet(viewsets.GenericViewSet,
                           mixins.ListModelMixin,
                           mixins.CreateModelMixin,
                           mixins.DestroyModelMixin):
    """
    영상 북마크 API
    GET    /api/health/bookmarks/       - 내 북마크 목록
    POST   /api/health/bookmarks/       - 북마크 추가
    DELETE /api/health/bookmarks/<id>/  - 북마크 삭제
    """
    permission_classes = [IsAuthenticated]
    serializer_class = VideoBookmarkSerializer
    
    def get_queryset(self):
        return VideoBookmark.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LifestyleTipViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    """
    라이프스타일 팁 API (프리미엄 전용)
    GET /api/health/lifestyle-tips/?date=2026-03-16
    
    해당 날짜 팁이 없으면 GPT로 자동 생성 후 반환
    """
    permission_classes = [IsAuthenticated, IsPremiumUser]
    serializer_class = LifestyleTipSerializer
    
    def get_queryset(self):
        return LifestyleTip.objects.filter(user=self.request.user)
    
    def list(self, request):
        """날짜별 라이프스타일 팁 조회 (없으면 자동 생성)"""
        date_str = request.query_params.get('date')
        
        if not date_str:
            date_str = timezone.now().strftime('%Y-%m-%d')
        
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # 캐시 확인
        tips = LifestyleTip.objects.filter(user=request.user, date=target_date)
        
        if tips.count() < 4:
            # GPT로 생성
            from .services import generate_daily_lifestyle_tips
            try:
                tips = generate_daily_lifestyle_tips(request.user, target_date)
            except Exception as e:
                return Response(
                    {'error': '팁 생성 중 오류가 발생했습니다.', 'detail': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            tips = LifestyleTip.objects.filter(user=request.user, date=target_date)
        
        serializer = LifestyleTipSerializer(tips, many=True)
        return Response(serializer.data)

