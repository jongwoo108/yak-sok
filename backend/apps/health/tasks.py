"""
Health Tasks - Celery 태스크
YouTube 캐시 갱신, 건강 프로필 분석
"""

import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# 카테고리 매핑 (GPT 키워드 카테고리 → CachedVideo 카테고리)
CATEGORY_MAP = {
    'diet': 'diet',
    'exercise': 'exercise',
    'lifestyle': 'lifestyle',
    'medical': 'medical',
}


@shared_task
def refresh_youtube_cache():
    """
    매일 05:00 - 모든 활성 사용자의 건강 프로필 기반 YouTube 캐시 갱신
    
    흐름:
    1. 모든 활성 건강 프로필에서 고유 검색 키워드 수집
    2. 키워드별 YouTube API 검색
    3. CachedVideo에 저장 (중복 제거)
    """
    from .models import UserHealthProfile
    from .youtube_service import search_and_cache_videos
    
    profiles = UserHealthProfile.objects.filter(
        conditions__len__gt=0  # 질병이 추론된 프로필만
    ).exclude(search_queries=[])
    
    # 모든 프로필의 검색 키워드를 수집 (중복 제거)
    seen_queries = set()
    search_tasks = []
    
    for profile in profiles:
        for query_data in profile.search_queries:
            query = query_data.get('query', '')
            if query and query not in seen_queries:
                seen_queries.add(query)
                search_tasks.append({
                    'query': query,
                    'category': CATEGORY_MAP.get(query_data.get('category', ''), 'general'),
                    'condition': query_data.get('condition', ''),
                })
    
    total_new = 0
    for task in search_tasks:
        condition_names = [task['condition']] if task['condition'] else None
        new_count = search_and_cache_videos(
            query=task['query'],
            content_category=task['category'],
            condition_names=condition_names,
        )
        total_new += new_count
    
    logger.info(
        f"[YouTube Cache Refresh] "
        f"검색 {len(search_tasks)}회, 신규 영상 {total_new}개 캐시됨"
    )
    
    return {
        'searches': len(search_tasks),
        'new_videos': total_new,
    }


@shared_task
def refresh_user_health_profile(user_id):
    """
    약 등록/수정 시 트리거 - 질병 재추론 + 키워드 생성 + 즉시 검색
    
    Args:
        user_id: 사용자 ID
    """
    from django.contrib.auth import get_user_model
    from .services import analyze_and_update_profile
    from .youtube_service import search_and_cache_videos
    
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"[Health Profile] 사용자 {user_id}를 찾을 수 없습니다.")
        return
    
    # 1. 질병 추론 + 키워드 생성
    profile = analyze_and_update_profile(user)
    
    # 2. 새 키워드로 즉시 YouTube 검색 (신규 질병에 대한 콘텐츠 확보)
    new_count = 0
    for query_data in profile.search_queries:
        query = query_data.get('query', '')
        category = CATEGORY_MAP.get(query_data.get('category', ''), 'general')
        condition_name = query_data.get('condition', '')
        condition_names = [condition_name] if condition_name else None
        
        new_count += search_and_cache_videos(
            query=query,
            content_category=category,
            condition_names=condition_names,
        )
    
    logger.info(
        f"[Health Profile] 사용자 {user.username}: "
        f"질병 {len(profile.conditions)}개 추론, "
        f"키워드 {len(profile.search_queries)}개, "
        f"신규 영상 {new_count}개"
    )
