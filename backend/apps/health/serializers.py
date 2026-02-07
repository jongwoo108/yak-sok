"""
Health Serializers - 건강 프로필, 영상 피드
"""

from rest_framework import serializers
from .models import (
    UserHealthProfile, HealthCondition, CachedVideo,
    VideoBookmark, TrustedChannel,
)


class HealthConditionSerializer(serializers.ModelSerializer):
    """질병/증상 시리얼라이저"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = HealthCondition
        fields = ['id', 'name', 'category', 'category_display']


class UserHealthProfileSerializer(serializers.ModelSerializer):
    """사용자 건강 프로필 시리얼라이저"""
    
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserHealthProfile
        fields = [
            'id', 'username', 'conditions', 'search_queries',
            'last_analyzed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CachedVideoListSerializer(serializers.ModelSerializer):
    """영상 목록 시리얼라이저 (피드 썸네일용)"""
    
    conditions = HealthConditionSerializer(many=True, read_only=True)
    content_category_display = serializers.CharField(
        source='get_content_category_display', read_only=True
    )
    is_bookmarked = serializers.SerializerMethodField()
    
    class Meta:
        model = CachedVideo
        fields = [
            'id', 'video_id', 'title', 'thumbnail_url',
            'channel_title', 'channel_id', 'published_at',
            'view_count', 'content_category', 'content_category_display',
            'conditions', 'is_from_trusted_channel', 'is_bookmarked',
        ]
    
    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return VideoBookmark.objects.filter(
                user=request.user, video=obj
            ).exists()
        return False


class CachedVideoDetailSerializer(CachedVideoListSerializer):
    """영상 상세 시리얼라이저"""
    
    class Meta(CachedVideoListSerializer.Meta):
        fields = CachedVideoListSerializer.Meta.fields + [
            'description', 'search_query', 'fetched_at', 'updated_at',
        ]


class VideoBookmarkSerializer(serializers.ModelSerializer):
    """영상 북마크 시리얼라이저"""
    
    video_detail = CachedVideoListSerializer(source='video', read_only=True)
    
    class Meta:
        model = VideoBookmark
        fields = ['id', 'video', 'video_detail', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_video(self, value):
        request = self.context.get('request')
        if request and VideoBookmark.objects.filter(
            user=request.user, video=value
        ).exists():
            raise serializers.ValidationError('이미 북마크된 영상입니다.')
        return value
