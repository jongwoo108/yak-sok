"""
Health Models - 건강 프로필, 유튜브 영상 캐시, 신뢰 채널
"""

from django.db import models
from django.conf import settings


class UserHealthProfile(models.Model):
    """
    사용자 건강 프로필 - 약 기반 질병 추론 결과
    사용자가 등록한 약품 목록을 LLM이 분석하여 추정 질병을 저장
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='health_profile',
        verbose_name='사용자'
    )
    conditions = models.JSONField(
        default=list,
        verbose_name='추론된 질병/증상',
        help_text='예: [{"name": "고혈압", "category": "심혈관"}]'
    )
    search_queries = models.JSONField(
        default=list,
        verbose_name='YouTube 검색 키워드',
        help_text='질병 기반 생성된 검색 키워드 목록'
    )
    last_analyzed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='마지막 분석 일시'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '건강 프로필'
        verbose_name_plural = '건강 프로필 목록'
    
    def __str__(self):
        condition_names = [c.get('name', '') for c in self.conditions] if self.conditions else []
        return f"{self.user.username} - {', '.join(condition_names) or '분석 전'}"


class HealthCondition(models.Model):
    """
    질병/증상 마스터 데이터
    """
    
    class Category(models.TextChoices):
        CARDIOVASCULAR = 'cardiovascular', '심혈관'
        ENDOCRINE = 'endocrine', '내분비'
        RESPIRATORY = 'respiratory', '호흡기'
        DIGESTIVE = 'digestive', '소화기'
        MUSCULOSKELETAL = 'musculoskeletal', '근골격'
        NEUROLOGICAL = 'neurological', '신경'
        MENTAL = 'mental', '정신건강'
        DERMATOLOGICAL = 'dermatological', '피부'
        IMMUNE = 'immune', '면역'
        OTHER = 'other', '기타'
    
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='질병명'
    )
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER,
        verbose_name='카테고리'
    )
    description = models.TextField(
        blank=True,
        verbose_name='설명'
    )
    keywords = models.JSONField(
        default=list,
        verbose_name='검색 키워드'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '질병/증상'
        verbose_name_plural = '질병/증상 목록'
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class TrustedChannel(models.Model):
    """
    신뢰 채널 화이트리스트
    의사, 약사, 공공기관 등 신뢰할 수 있는 YouTube 채널
    """
    
    class ChannelType(models.TextChoices):
        DOCTOR = 'doctor', '의사'
        PHARMACIST = 'pharmacist', '약사'
        PUBLIC = 'public', '공공기관'
        EXPERT = 'expert', '전문가'
        OTHER = 'other', '기타'
    
    channel_id = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='YouTube 채널 ID'
    )
    channel_title = models.CharField(
        max_length=200,
        verbose_name='채널명'
    )
    channel_type = models.CharField(
        max_length=20,
        choices=ChannelType.choices,
        default=ChannelType.OTHER,
        verbose_name='채널 유형'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = '신뢰 채널'
        verbose_name_plural = '신뢰 채널 목록'
        ordering = ['channel_type', 'channel_title']
    
    def __str__(self):
        return f"{self.channel_title} ({self.get_channel_type_display()})"


class CachedVideo(models.Model):
    """
    YouTube 영상 캐시
    YouTube API 검색 결과를 DB에 캐시하여 할당량 절약
    """
    
    class ContentCategory(models.TextChoices):
        DIET = 'diet', '식이요법'
        EXERCISE = 'exercise', '운동'
        LIFESTYLE = 'lifestyle', '생활습관'
        MEDICAL = 'medical', '전문의 설명'
        GENERAL = 'general', '일반 건강'
    
    video_id = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='YouTube 영상 ID'
    )
    title = models.CharField(
        max_length=300,
        verbose_name='제목'
    )
    description = models.TextField(
        blank=True,
        verbose_name='설명'
    )
    thumbnail_url = models.URLField(
        verbose_name='썸네일 URL'
    )
    channel_title = models.CharField(
        max_length=200,
        verbose_name='채널명'
    )
    channel_id = models.CharField(
        max_length=50,
        verbose_name='채널 ID'
    )
    published_at = models.DateTimeField(
        verbose_name='영상 게시일'
    )
    view_count = models.PositiveIntegerField(
        default=0,
        verbose_name='조회수'
    )
    
    # 분류
    conditions = models.ManyToManyField(
        HealthCondition,
        blank=True,
        related_name='videos',
        verbose_name='관련 질병'
    )
    content_category = models.CharField(
        max_length=20,
        choices=ContentCategory.choices,
        default=ContentCategory.GENERAL,
        verbose_name='콘텐츠 카테고리'
    )
    search_query = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='검색 키워드'
    )
    
    # 품질 관리
    is_from_trusted_channel = models.BooleanField(
        default=False,
        verbose_name='신뢰 채널 영상'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='활성 상태'
    )
    
    fetched_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = '캐시 영상'
        verbose_name_plural = '캐시 영상 목록'
        ordering = ['-is_from_trusted_channel', '-published_at']
    
    def __str__(self):
        trusted = '[신뢰]' if self.is_from_trusted_channel else ''
        return f"{trusted} {self.title[:50]}"


class VideoBookmark(models.Model):
    """
    사용자 영상 북마크
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='video_bookmarks',
        verbose_name='사용자'
    )
    video = models.ForeignKey(
        CachedVideo,
        on_delete=models.CASCADE,
        related_name='bookmarks',
        verbose_name='영상'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = '영상 북마크'
        verbose_name_plural = '영상 북마크 목록'
        unique_together = ('user', 'video')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.video.title[:30]}"
