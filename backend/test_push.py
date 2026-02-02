import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.alerts.fcm_service import FCMService

User = get_user_model()

# FCM 토큰이 있는 사용자 찾기
users_with_token = User.objects.exclude(fcm_token__isnull=True).exclude(fcm_token='')

with open('push_result.txt', 'w', encoding='utf-8') as f:
    if not users_with_token.exists():
        f.write("FCM 토큰이 등록된 사용자가 없습니다. 앱을 실행하여 토큰을 등록해주세요.\n")
    else:
        for user in users_with_token:
            f.write(f"사용자 발견: {user.email} (Token: {user.fcm_token[:10]}...)\n")
            
            success = FCMService.send_notification(
                token=user.fcm_token,
                title="테스트 알림",
                body="이 알림이 보이면 푸시 알림 연동 성공입니다!",
                data={"type": "test"}
            )
            
            if success:
                f.write(">> 알림 발송 요청 성공!\n")
            else:
                f.write(">> 알림 발송 실패. 토큰이 만료되었거나 설정이 잘못되었습니다.\n")
