"""
YouTube Service - YouTube Data API v3 연동
"""

import os
import logging
import requests
from datetime import datetime
from django.utils import timezone
from django.utils.dateparse import parse_datetime

logger = logging.getLogger(__name__)

YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY', '')
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


def search_youtube_videos(query, max_results=10):
    """
    YouTube 영상 검색
    
    Args:
        query: 검색 키워드
        max_results: 최대 결과 수 (기본 10)
        
    Returns:
        list: 영상 정보 딕셔너리 리스트
    """
    if not YOUTUBE_API_KEY:
        logger.warning("YOUTUBE_API_KEY가 설정되지 않았습니다.")
        return []
    
    try:
        params = {
            'part': 'snippet',
            'q': query,
            'type': 'video',
            'maxResults': max_results,
            'relevanceLanguage': 'ko',
            'regionCode': 'KR',
            'order': 'relevance',
            'safeSearch': 'strict',
            'key': YOUTUBE_API_KEY,
        }
        
        response = requests.get(YOUTUBE_SEARCH_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        videos = []
        for item in data.get('items', []):
            snippet = item.get('snippet', {})
            video_id = item.get('id', {}).get('videoId', '')
            
            if not video_id:
                continue
            
            # 썸네일 URL (고화질 우선)
            thumbnails = snippet.get('thumbnails', {})
            thumbnail_url = (
                thumbnails.get('high', {}).get('url') or
                thumbnails.get('medium', {}).get('url') or
                thumbnails.get('default', {}).get('url', '')
            )
            
            # 게시일 파싱
            published_str = snippet.get('publishedAt', '')
            published_at = parse_datetime(published_str) if published_str else timezone.now()
            
            videos.append({
                'video_id': video_id,
                'title': snippet.get('title', ''),
                'description': snippet.get('description', ''),
                'thumbnail_url': thumbnail_url,
                'channel_title': snippet.get('channelTitle', ''),
                'channel_id': snippet.get('channelId', ''),
                'published_at': published_at,
            })
        
        logger.info(f"[YouTube] '{query}' 검색 결과: {len(videos)}개")
        return videos
        
    except requests.RequestException as e:
        logger.error(f"[YouTube] 검색 실패: {e}")
        return []


def get_video_statistics(video_ids):
    """
    영상 통계 정보 조회 (조회수 등)
    videos.list는 1 유닛이므로 비용 효율적
    
    Args:
        video_ids: YouTube 영상 ID 리스트
        
    Returns:
        dict: {video_id: {"view_count": int}}
    """
    if not YOUTUBE_API_KEY or not video_ids:
        return {}
    
    try:
        params = {
            'part': 'statistics',
            'id': ','.join(video_ids[:50]),  # 최대 50개
            'key': YOUTUBE_API_KEY,
        }
        
        response = requests.get(YOUTUBE_VIDEOS_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        stats = {}
        for item in data.get('items', []):
            vid = item.get('id', '')
            statistics = item.get('statistics', {})
            stats[vid] = {
                'view_count': int(statistics.get('viewCount', 0)),
            }
        
        return stats
        
    except requests.RequestException as e:
        logger.error(f"[YouTube] 통계 조회 실패: {e}")
        return {}


def search_and_cache_videos(query, content_category='general', condition_names=None):
    """
    YouTube 검색 후 DB에 캐시 저장
    
    Args:
        query: 검색 키워드
        content_category: 콘텐츠 카테고리
        condition_names: 관련 질병명 리스트
        
    Returns:
        int: 새로 저장된 영상 수
    """
    from .models import CachedVideo, TrustedChannel, HealthCondition
    
    videos = search_youtube_videos(query, max_results=10)
    if not videos:
        return 0
    
    # 신뢰 채널 ID 목록
    trusted_channel_ids = set(
        TrustedChannel.objects.filter(is_active=True)
        .values_list('channel_id', flat=True)
    )
    
    # 조회수 정보 가져오기
    video_ids = [v['video_id'] for v in videos]
    stats = get_video_statistics(video_ids)
    
    # 관련 질병 조회
    conditions = []
    if condition_names:
        conditions = list(
            HealthCondition.objects.filter(name__in=condition_names)
        )
    
    new_count = 0
    for video_data in videos:
        vid = video_data['video_id']
        video_stats = stats.get(vid, {})
        
        video, created = CachedVideo.objects.update_or_create(
            video_id=vid,
            defaults={
                'title': video_data['title'],
                'description': video_data['description'],
                'thumbnail_url': video_data['thumbnail_url'],
                'channel_title': video_data['channel_title'],
                'channel_id': video_data['channel_id'],
                'published_at': video_data['published_at'],
                'view_count': video_stats.get('view_count', 0),
                'content_category': content_category,
                'search_query': query,
                'is_from_trusted_channel': video_data['channel_id'] in trusted_channel_ids,
                'is_active': True,
            }
        )
        
        # 질병 연결
        if conditions:
            video.conditions.set(conditions)
        
        if created:
            new_count += 1
    
    logger.info(f"[YouTube Cache] '{query}' → {new_count}개 신규 저장 (총 {len(videos)}개)")
    return new_count
