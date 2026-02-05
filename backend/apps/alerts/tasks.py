"""
Alerts Tasks - Celery 비동기 태스크
Safety Line의 핵심 워크플로우 구현
"""

from celery import shared_task
from celery.result import AsyncResult
from django.utils import timezone
from django.conf import settings


# 시간대별 알림 메시지 정의 (이모지 없음)
TIME_SLOT_MESSAGES = {
    'morning': {
        'title': '복약 알림',
        'body': '좋은 아침이에요! 아침약 드실 시간이에요.'
    },
    'noon': {
        'title': '복약 알림',
        'body': '점심약 드실 시간이에요.'
    },
    'evening': {
        'title': '복약 알림',
        'body': '저녁약 드실 시간이에요.'
    },
    'night': {
        'title': '복약 알림',
        'body': '주무시기 전 약 드셨나요?'
    },
    'custom': {
        'title': '복약 알림',
        'body': '약 드실 시간이에요.'
    }
}


@shared_task(bind=True, max_retries=3)
def schedule_medication_alert(self, medication_log_id):
    """
    복약 알림 전체 예약 (정시 리마인더 + 비상 알림)
    """
    from apps.medications.models import MedicationLog
    from apps.alerts.models import Alert
    from django.conf import settings
    
    try:
        log = MedicationLog.objects.get(id=medication_log_id)
        user = log.schedule.medication.user
        
        # 1. 정시 리마인더 예약 (예정 시간)
        send_scheduled_reminder.apply_async(
            args=[log.id],
            eta=log.scheduled_datetime
        )
        
        # 2. 비상 알림 예약 (예정 시간 + 임계 시간)
        # 중증 질환인 경우 임계 시간을 0으로 설정하여 보호자에게 즉시 알림
        is_severe = log.schedule.medication.group.is_severe if log.schedule.medication.group else False
        
        if is_severe:
            threshold = 0
            alert_title = '[긴급/중증] 미복약 알림'
            alert_message = f'중증 질환 약({log.schedule.medication.name})의 복용 시간이 되었습니다. 즉시 확인이 필요합니다.'
        else:
            threshold = settings.SAFETY_LINE_SETTINGS.get('DEFAULT_THRESHOLD_MINUTES', 30)
            alert_title = '미복약 알림'
            alert_message = f'{log.schedule.medication.name} 복용 시간이 {threshold}분 경과했습니다.'
            
        alert_time = log.scheduled_datetime + timezone.timedelta(minutes=threshold)
        
        # 알림 레코드 생성 (비상 알림용)
        alert = Alert.objects.create(
            user=user,
            medication_log=log,
            alert_type=Alert.AlertType.EMERGENCY if is_severe else Alert.AlertType.WARNING,
            title=alert_title,
            message=alert_message,
            scheduled_at=alert_time,
        )
        
        # 비상 알림 태스크 예약
        task = trigger_safety_alert.apply_async(
            args=[alert.id],
            eta=alert_time
        )
        
        alert.celery_task_id = task.id
        alert.save()
        
        log.celery_task_id = task.id
        log.save()
        
        return {'status': 'all_scheduled', 'log_id': log.id}
        
    except MedicationLog.DoesNotExist:
        return {'status': 'error', 'message': '복약 기록을 찾을 수 없습니다.'}
    except Exception as exc:
        print(f"[Alert] 예약 중 예외 발생: {exc}")
        self.retry(exc=exc, countdown=60)


@shared_task
def send_scheduled_reminder(medication_log_id):
    """
    정시 복약 리마인더 발송 (시간대별 그룹 알림)
    - 같은 사용자, 같은 시간에는 알림 1개만 발송
    - 시간대(time_of_day)에 따라 메시지 변경
    """
    from apps.medications.models import MedicationLog
    from apps.alerts.fcm_service import FCMService
    from django.core.cache import cache
    
    try:
        log = MedicationLog.objects.select_related(
            'schedule', 
            'schedule__medication', 
            'schedule__medication__user'
        ).get(id=medication_log_id)
        
        user = log.schedule.medication.user
        time_of_day = log.schedule.time_of_day
        scheduled_time = log.scheduled_datetime
        
        # 중복 발송 방지: 같은 사용자, 같은 시간대(아침/점심/저녁/취침전)에 이미 알림이 발송되었는지 확인
        # 캐시 키: user_id + 날짜 + 시간대(time_of_day)
        cache_key = f"reminder_sent:{user.id}:{scheduled_time.strftime('%Y-%m-%d')}:{time_of_day}"
        
        # cache.add()는 키가 없을 때만 설정 (atomic operation, race condition 방지)
        # 반환값: True면 새로 설정됨 (이 태스크가 알림 발송), False면 이미 존재 (스킵)
        if not cache.add(cache_key, True, 3600):
            print(f"[Reminder] 이미 발송된 시간대 알림 (user={user.id}, time_of_day={time_of_day})")
            return {'status': 'skipped', 'reason': 'already_sent_for_time_slot'}
        
        # 같은 시간대에 미복용 약이 있는지 확인
        pending_logs = MedicationLog.objects.filter(
            schedule__medication__user=user,
            scheduled_datetime=scheduled_time,
            status='pending'
        ).count()
        
        if pending_logs == 0:
            return {'status': 'skipped', 'reason': 'all_taken'}
            
        if not user.fcm_token:
            return {'status': 'skipped', 'reason': 'no_token'}
        
        # 시간대별 메시지 가져오기
        message_config = TIME_SLOT_MESSAGES.get(time_of_day, TIME_SLOT_MESSAGES['custom'])
        
        success = FCMService.send_notification(
            token=user.fcm_token,
            title=message_config['title'],
            body=message_config['body'],
            data={
                'type': 'medication_reminder',
                'time_of_day': time_of_day,
                'scheduled_time': scheduled_time.isoformat()
            }
        )
        
        # 발송 실패 시 캐시 삭제하여 재시도 가능하게 함
        if not success:
            cache.delete(cache_key)
        
        return {'status': 'sent' if success else 'failed'}
    except Exception as e:
        print(f"[Reminder] 발송 에러: {e}")
        return {'status': 'error', 'message': str(e)}


@shared_task(bind=True)
def trigger_safety_alert(self, alert_id):
    """
    Safety Line 비상 알림 발송
    1단계: 시니어 본인 알림
    2단계: 보호자 푸시 알림
    - 시간대(time_of_day)별로 1개만 발송 (중복 방지)
    """
    from apps.alerts.models import Alert
    from apps.users.models import GuardianRelation
    from django.core.cache import cache
    
    try:
        alert = Alert.objects.select_related('medication_log__schedule').get(id=alert_id)
        
        # 이미 취소되었으면 종료
        if alert.status == Alert.Status.CANCELLED:
            return {'status': 'cancelled', 'alert_id': alert_id}
        
        user = alert.user
        
        # 시간대 정보 가져오기
        time_of_day = 'unknown'
        if alert.medication_log and alert.medication_log.schedule:
            time_of_day = alert.medication_log.schedule.time_of_day
        
        # 중복 발송 방지: 같은 사용자, 같은 날, 같은 시간대에 이미 비상 알림이 발송되었는지 확인
        today = timezone.localdate()
        cache_key = f"safety_alert_sent:{user.id}:{today}:{time_of_day}"
        
        if not cache.add(cache_key, True, 3600):
            print(f"[Safety Alert] 이미 발송된 시간대 비상 알림 (user={user.id}, time_of_day={time_of_day})")
            # 알림 상태를 CANCELLED로 업데이트 (중복)
            alert.status = Alert.Status.CANCELLED
            alert.save()
            return {'status': 'skipped', 'reason': 'already_sent_for_time_slot'}
        
        # 1단계: 시니어 본인 알림
        send_push_notification(
            user_id=user.id,
            title=alert.title,
            message=alert.message,
            severity=alert.alert_type  # 심각도 전달
        )
        
        # 2단계: 보호자 알림
        guardian_relations = GuardianRelation.objects.filter(senior=user)
        for relation in guardian_relations:
            guardian = relation.guardian
            send_push_notification(
                user_id=guardian.id,
                title=f'[긴급] {user.first_name}님 미복약 알림',
                message=alert.message,
                severity=Alert.AlertType.EMERGENCY  # 보호자 알림은 긴급으로 처리
            )
        
        # 알림 상태 업데이트
        alert.status = Alert.Status.SENT
        alert.sent_at = timezone.now()
        alert.save()
        
        return {'status': 'sent', 'alert_id': alert_id}
        
    except Alert.DoesNotExist:
        return {'status': 'error', 'message': '알림을 찾을 수 없습니다.'}


@shared_task
def send_push_notification(user_id, title, message, severity='reminder'):
    """
    FCM 푸시 알림 발송
    """
    from django.contrib.auth import get_user_model
    from apps.alerts.fcm_service import FCMService
    
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
        fcm_token = user.fcm_token
        
        if not fcm_token:
            print(f"[Push] 사용자 {user.username}의 FCM 토큰이 없습니다.")
            return {'status': 'skipped', 'reason': 'FCM 토큰 없음'}
        
        # FCM 푸시 알림 발송
        success = FCMService.send_notification(
            token=fcm_token,
            title=title,
            body=message,
            data={
                'user_id': str(user_id),
                'severity': severity  # 심각도 추가
            }
        )
        
        if success:
            print(f"[Push] 사용자 {user.username}에게 알림 발송 성공")
            return {'status': 'sent', 'user_id': user_id}
        else:
            print(f"[Push] 사용자 {user.username}에게 알림 발송 실패")
            return {'status': 'failed', 'user_id': user_id}
        
    except User.DoesNotExist:
        return {'status': 'error', 'message': '사용자를 찾을 수 없습니다.'}


def revoke_alert_task(task_id):
    """
    예약된 알림 태스크 취소
    복약 완료 시 호출
    """
    from apps.alerts.models import Alert
    from celery.result import AsyncResult
    
    # Celery 태스크 취소
    AsyncResult(task_id).revoke(terminate=True)
    
    # 관련 알림 상태 업데이트
    Alert.objects.filter(celery_task_id=task_id).update(
        status=Alert.Status.CANCELLED
    )
    
    return {'status': 'revoked', 'task_id': task_id}


@shared_task
def schedule_daily_reminders():
    """
    매일 실행되는 복약 알림 스케줄러
    오늘 날짜의 pending 상태인 MedicationLog에 대해 알림 예약
    Celery Beat에서 매일 00:05에 실행
    """
    from apps.medications.models import MedicationLog
    from django.db.models import Min
    
    today = timezone.localdate()
    today_start = timezone.make_aware(
        timezone.datetime.combine(today, timezone.datetime.min.time())
    )
    today_end = timezone.make_aware(
        timezone.datetime.combine(today, timezone.datetime.max.time())
    )
    
    # 오늘의 pending 상태 로그를 사용자별, 시간별로 그룹화하여 첫 번째만 가져오기
    # 같은 시간대에는 알림 1개만 예약
    logs = MedicationLog.objects.filter(
        scheduled_datetime__gte=today_start,
        scheduled_datetime__lte=today_end,
        status='pending'
    ).select_related(
        'schedule',
        'schedule__medication',
        'schedule__medication__user'
    ).order_by('scheduled_datetime')
    
    # 사용자별, 시간대(time_of_day)별로 이미 예약된 것 추적
    scheduled_alerts = set()  # (user_id, time_of_day)
    scheduled_count = 0
    skipped_count = 0
    
    for log in logs:
        user_id = log.schedule.medication.user_id
        time_of_day = log.schedule.time_of_day  # 아침/점심/저녁/취침전
        key = (user_id, time_of_day)
        
        if key not in scheduled_alerts:
            # 아직 예약되지 않은 시간대 → 알림 예약
            try:
                schedule_medication_alert.delay(log.id)
                scheduled_alerts.add(key)
                scheduled_count += 1
                print(f"[Daily Scheduler] 알림 예약: user={user_id}, time_of_day={time_of_day}, log_id={log.id}")
            except Exception as e:
                print(f"[Daily Scheduler] 알림 예약 실패: {e}")
        else:
            skipped_count += 1
    
    result = {
        'status': 'completed',
        'date': str(today),
        'scheduled': scheduled_count,
        'skipped': skipped_count,
        'total_logs': logs.count()
    }
    print(f"[Daily Scheduler] 완료: {result}")
    return result
