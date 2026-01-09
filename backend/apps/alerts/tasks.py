"""
Alerts Tasks - Celery 비동기 태스크
Safety Line의 핵심 워크플로우 구현
"""

from celery import shared_task
from celery.result import AsyncResult
from django.utils import timezone
from django.conf import settings


@shared_task(bind=True, max_retries=3)
def schedule_medication_alert(self, medication_log_id):
    """
    복약 알림 예약
    복약 시간 등록 시 호출되어 비상 알림 작업 예약
    """
    from apps.medications.models import MedicationLog
    from apps.alerts.models import Alert
    
    try:
        log = MedicationLog.objects.get(id=medication_log_id)
        user = log.schedule.medication.user
        threshold = settings.SAFETY_LINE_SETTINGS['DEFAULT_THRESHOLD_MINUTES']
        
        # 비상 알림 시간 계산 (예정 시간 + 임계 시간)
        alert_time = log.scheduled_datetime + timezone.timedelta(minutes=threshold)
        
        # 알림 레코드 생성
        alert = Alert.objects.create(
            user=user,
            medication_log=log,
            alert_type=Alert.AlertType.WARNING,
            title='미복약 알림',
            message=f'{log.schedule.medication.name} 복용 시간이 {threshold}분 경과했습니다.',
            scheduled_at=alert_time,
        )
        
        # 비상 알림 태스크 예약
        eta = alert_time
        task = trigger_safety_alert.apply_async(
            args=[alert.id],
            eta=eta
        )
        
        # 태스크 ID 저장 (취소를 위해)
        alert.celery_task_id = task.id
        alert.save()
        
        log.celery_task_id = task.id
        log.save()
        
        return {'status': 'scheduled', 'alert_id': alert.id, 'task_id': task.id}
        
    except MedicationLog.DoesNotExist:
        return {'status': 'error', 'message': '복약 기록을 찾을 수 없습니다.'}
    except Exception as exc:
        self.retry(exc=exc, countdown=60)


@shared_task(bind=True)
def trigger_safety_alert(self, alert_id):
    """
    Safety Line 비상 알림 발송
    1단계: 시니어 본인 알림
    2단계: 보호자 푸시 알림
    3단계: 비상 연락처 호출
    """
    from apps.alerts.models import Alert
    from apps.users.models import GuardianRelation
    
    try:
        alert = Alert.objects.get(id=alert_id)
        
        # 이미 취소되었으면 종료
        if alert.status == Alert.Status.CANCELLED:
            return {'status': 'cancelled', 'alert_id': alert_id}
        
        user = alert.user
        
        # 1단계: 시니어 본인 알림
        send_push_notification(
            user_id=user.id,
            title=alert.title,
            message=alert.message
        )
        
        # 2단계: 보호자 알림
        guardian_relations = GuardianRelation.objects.filter(senior=user)
        for relation in guardian_relations:
            guardian = relation.guardian
            send_push_notification(
                user_id=guardian.id,
                title=f'[긴급] {user.first_name}님 미복약 알림',
                message=alert.message
            )
        
        # 알림 상태 업데이트
        alert.status = Alert.Status.SENT
        alert.sent_at = timezone.now()
        alert.save()
        
        return {'status': 'sent', 'alert_id': alert_id}
        
    except Alert.DoesNotExist:
        return {'status': 'error', 'message': '알림을 찾을 수 없습니다.'}


@shared_task
def send_push_notification(user_id, title, message):
    """
    FCM 푸시 알림 발송
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
        fcm_token = user.fcm_token
        
        if not fcm_token:
            return {'status': 'skipped', 'reason': 'FCM 토큰 없음'}
        
        # TODO: Firebase Admin SDK를 통한 푸시 알림 발송
        # firebase_admin.messaging.send(...)
        
        return {'status': 'sent', 'user_id': user_id}
        
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
