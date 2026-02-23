"""
Medications Signals - 약 변경 시 건강 프로필 자동 재분석
"""

import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Medication

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Medication)
@receiver(post_delete, sender=Medication)
def trigger_health_profile_refresh(sender, instance, **kwargs):
    """
    약이 생성/수정/삭제될 때 건강 프로필 재분석 Celery 태스크 트리거
    - GPT-4o로 질병 재추론
    - 새 키워드로 YouTube 영상 재검색
    """
    try:
        from apps.health.tasks import refresh_user_health_profile
        refresh_user_health_profile.delay(instance.user_id)
        logger.info(
            f"[Medications Signal] 사용자 {instance.user_id}의 "
            f"건강 프로필 재분석 태스크 트리거됨 (약: {instance.name})"
        )
    except Exception as e:
        logger.error(f"[Medications Signal] 건강 프로필 재분석 트리거 실패: {e}")
