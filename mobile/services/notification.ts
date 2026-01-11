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

            // Expo Push Token 대신 Device Push Token(FCM)을 사용하려면 getDevicePushTokenAsync 사용
            // 여기서는 백엔드가 FCM을 직접 사용하므로 DevicePushToken이 필요할 수 있음
            // 하지만 Expo 개발 편의성을 위해 Expo Push Token을 먼저 시도하거나,
            // 프로젝트 설정에 따라 FCM 토큰을 명시적으로 가져와야 함.

            // NOTE: 실제 배포 시에는 FCM 직접 연동이 권장되나, 현재는 Expo Config에 의존.
            // 일단 Expo Token을 가져오고 백엔드 호환성을 확인.
            // 만약 백엔드가 Raw FCM 토큰만 받는다면 아래 로직을 수정해야 함.
            try {
                // projectId는 app.json에서 가져옴
                const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.manifest?.extra?.eas?.projectId;
                if (!projectId) {
                    throw new Error('Project ID not found in app.json');
                }

                const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
                token = tokenData.data;
                console.log('Expo Push Token:', token);
            } catch (e: any) {
                console.error('토큰 발급 실패:', e);
                // 사용자에게 에러 알림
                Alert.alert('알림 설정 오류', `푸시 토큰을 가져올 수 없습니다: ${e.message}`);

                if (e.message.includes('Project ID')) {
                    console.log('EAS Project ID가 설정되지 않았습니다.');
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
