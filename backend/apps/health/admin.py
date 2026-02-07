"""
Health Admin - 건강 정보 관리
"""

from django.contrib import admin
from .models import (
    UserHealthProfile, HealthCondition, TrustedChannel,
    CachedVideo, VideoBookmark,
)


@admin.register(UserHealthProfile)
class UserHealthProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_conditions_display', 'get_queries_count', 'last_analyzed_at']
    list_filter = ['last_analyzed_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_conditions_display(self, obj):
        if obj.conditions:
            names = [c.get('name', '') for c in obj.conditions[:3]]
            suffix = f" 외 {len(obj.conditions) - 3}개" if len(obj.conditions) > 3 else ""
            return ', '.join(names) + suffix
        return '분석 전'
    get_conditions_display.short_description = '추론된 질병'
    
    def get_queries_count(self, obj):
        return len(obj.search_queries) if obj.search_queries else 0
    get_queries_count.short_description = '검색 키워드 수'


@admin.register(HealthCondition)
class HealthConditionAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'created_at']
    list_filter = ['category']
    search_fields = ['name', 'description']


@admin.register(TrustedChannel)
class TrustedChannelAdmin(admin.ModelAdmin):
    list_display = ['channel_title', 'channel_type', 'channel_id', 'is_active', 'created_at']
    list_filter = ['channel_type', 'is_active']
    search_fields = ['channel_title', 'channel_id']


@admin.register(CachedVideo)
class CachedVideoAdmin(admin.ModelAdmin):
    list_display = [
        'title_short', 'channel_title', 'content_category',
        'view_count', 'is_from_trusted_channel', 'is_active', 'fetched_at'
    ]
    list_filter = ['content_category', 'is_from_trusted_channel', 'is_active']
    search_fields = ['title', 'channel_title', 'video_id']
    filter_horizontal = ['conditions']
    readonly_fields = ['fetched_at', 'updated_at']
    
    def title_short(self, obj):
        return obj.title[:50] + ('...' if len(obj.title) > 50 else '')
    title_short.short_description = '제목'


@admin.register(VideoBookmark)
class VideoBookmarkAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_video_title', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'video__title']
    
    def get_video_title(self, obj):
        return obj.video.title[:40]
    get_video_title.short_description = '영상'
