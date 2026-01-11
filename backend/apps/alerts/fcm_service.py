"""
Firebase Cloud Messaging (FCM) Service
푸시 알림 발송 서비스
"""

import os
import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings


class FCMService:
    """Firebase Cloud Messaging 푸시 알림 서비스"""
    
    _initialized = False
    
    @classmethod
    def initialize(cls):
        """Firebase Admin SDK 초기화"""
        if cls._initialized:
            return
        
        try:
            # 환경 변수 또는 파일 경로에서 credentials 로드
            cred_path = os.getenv(
                'GOOGLE_APPLICATION_CREDENTIALS',
                os.path.join(settings.BASE_DIR, 'firebase-credentials.json')
            )
            
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                cls._initialized = True
                print("[FCM] Firebase Admin SDK 초기화 완료")
            else:
                print(f"[FCM] 경고: Firebase credentials 파일을 찾을 수 없습니다: {cred_path}")
        except Exception as e:
            print(f"[FCM] Firebase 초기화 실패: {e}")
    
    @classmethod
    def send_notification(cls, token: str, title: str, body: str, data: dict = None) -> bool:
        """
        단일 기기에 푸시 알림 발송
        
        Args:
            token: FCM 기기 토큰
            title: 알림 제목
            body: 알림 내용
            data: 추가 데이터 (선택)
            
        Returns:
            성공 여부
        """
        # Expo Push Token 처리 (Expo Go 또는 EAS Build)
        if token.startswith('ExponentPushToken'):
            try:
                from exponent_server_sdk import PushClient, PushMessage
                from exponent_server_sdk import PushServerError, PushTicketError
                
                print(f"[Expo] Expo Push Token 감지: {token[:20]}...")
                
                response = PushClient().publish(
                    PushMessage(
                        to=token,
                        title=title,
                        body=body,
                        data=data or {},
                        sound='default',
                    )
                )
                
                try:
                    response.validate_response()
                    print(f"[Expo] 알림 발송 성공: {response.id}")
                    return True
                except PushTicketError as exc:
                    print(f"[Expo] 알림 발송 실패 (TicketError): {exc.push_response._asdict()}")
                    return False
                except PushServerError as exc:
                    print(f"[Expo] 알림 발송 실패 (ServerError): {exc.errors}")
                    return False
                    
            except ImportError:
                print("[Expo] exponent_server_sdk가 설치되지 않았습니다. pip install exponent_server_sdk")
                return False
            except Exception as e:
                print(f"[Expo] 알림 발송 중 예외 발생: {e}")
                import traceback
                traceback.print_exc()
                return False

        # 기존 FCM 처리 (Native)
        cls.initialize()
        
        if not cls._initialized:
            print("[FCM] Firebase가 초기화되지 않았습니다.")
            return False
        
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                token=token,
            )
            
            response = messaging.send(message)
            print(f"[FCM] 알림 발송 성공: {response}")
            return True
            
        except messaging.UnregisteredError:
            print(f"[FCM] 등록되지 않은 토큰: {token[:20]}...")
            return False
        except Exception as e:
            print(f"[FCM] 알림 발송 실패: {e}")
            return False
    
    @classmethod
    def send_medication_reminder(cls, token: str, medication_name: str, time_of_day: str) -> bool:
        """
        복약 알림 발송
        
        Args:
            token: FCM 기기 토큰
            medication_name: 약품명
            time_of_day: 복용 시간 (morning, noon, evening, night)
        """
        time_labels = {
            'morning': '아침',
            'noon': '점심',
            'evening': '저녁',
            'night': '취침 전'
        }
        
        time_label = time_labels.get(time_of_day, time_of_day)
        
        return cls.send_notification(
            token=token,
            title="💊 복약 시간이에요!",
            body=f"{time_label} 약을 복용할 시간입니다: {medication_name}",
            data={
                'type': 'medication_reminder',
                'medication_name': medication_name,
                'time_of_day': time_of_day,
            }
        )
    
    @classmethod
    def send_guardian_alert(cls, token: str, user_name: str, medication_name: str) -> bool:
        """
        보호자에게 미복용 알림 발송
        
        Args:
            token: 보호자 FCM 토큰
            user_name: 시니어 이름
            medication_name: 미복용 약품명
        """
        return cls.send_notification(
            token=token,
            title="⚠️ 복약 미확인 알림",
            body=f"{user_name}님이 {medication_name}을(를) 아직 복용하지 않았습니다.",
            data={
                'type': 'guardian_alert',
                'user_name': user_name,
                'medication_name': medication_name,
            }
        )


# 편의 함수
def send_medication_reminder(token: str, medication_name: str, time_of_day: str) -> bool:
    return FCMService.send_medication_reminder(token, medication_name, time_of_day)


def send_guardian_alert(token: str, user_name: str, medication_name: str) -> bool:
    return FCMService.send_guardian_alert(token, user_name, medication_name)
