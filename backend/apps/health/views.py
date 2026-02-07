"""
Health Views - 건강 프로필, 영상 피드 API
"""

from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q

from .models import (
    UserHealthProfile, HealthCondition, CachedVideo, VideoBookmark,
)
from .serializers import (
    UserHealthProfileSerializer,
    CachedVideoListSerializer,
    CachedVideoDetailSerializer,
    VideoBookmarkSerializer,
)


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
        """질병 재분석 요청 - GPT-5 Mini로 즉시 분석"""
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
