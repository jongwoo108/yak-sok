import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { api } from './api';

// 알림 핸들러 설정 (앱이 포그라운드에 있을 때 알림 처리 방식)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export class NotificationService {
    static async registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('알림 권한이 허용되지 않았습니다.');
                return;
            }

            // 백엔드가 Firebase Admin SDK를 사용하므로 네이티브 FCM 토큰 필요
            // getDevicePushTokenAsync()는 Android에서 FCM 토큰, iOS에서 APNs 토큰 반환
            try {
                const tokenData = await Notifications.getDevicePushTokenAsync();
                token = tokenData.data;
                console.log('Native Push Token (FCM/APNs):', token);
            } catch (e: any) {
                console.error('토큰 발급 실패:', e);
                // Fallback: Expo Push Token 시도 (개발 환경용)
                try {
                    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.manifest?.extra?.eas?.projectId;
                    if (projectId) {
                        const expoTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
                        token = expoTokenData.data;
                        console.log('Expo Push Token (fallback):', token);
                    }
                } catch (expoError) {
                    console.error('Expo 토큰도 발급 실패:', expoError);
                }
            }
        } else {
            console.log('물리 기기에서만 푸시 알림을 사용할 수 있습니다.');
        }

        return token;
    }

    static async updateServerToken() {
        try {
            const token = await this.registerForPushNotificationsAsync();
            if (token) {
                // 서버에 토큰 전송
                await api.users.updateFcmToken(token);
                console.log('FCM 토큰 서버 업데이트 성공');
            }
        } catch (error) {
            console.error('FCM 토큰 업데이트 실패:', error);
        }
    }

    // 알림 리스너 설정
    static addNotificationListeners(
        onNotificationReceived: (notification: Notifications.Notification) => void,
        onNotificationResponse: (response: Notifications.NotificationResponse) => void
    ) {
        const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

        return () => {
            receivedSubscription.remove();
            responseSubscription.remove();
        };
    }
}
