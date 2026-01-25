import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

export class NotificationService {
    private static initialized = false;

    static initialize() {
        if (this.initialized) {
            return;
        }

        // 알림 수신 시 동작 설정 (지연 초기화)
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        this.initialized = true;
    }

    static async registerForPushNotificationsAsync() {
        this.initialize();
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
                console.log('Failed to get push token for push notification!');
                return;
            }

            try {
                const projectId =
                    Constants.easConfig?.projectId ||
                    Constants.expoConfig?.extra?.eas?.projectId;

                token = projectId
                    ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
                    : (await Notifications.getExpoPushTokenAsync()).data;
                console.log('Expo Push Token:', token);
            } catch (error) {
                console.error('Error getting push token:', error);
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }

        return token;
    }

    static async updateServerToken() {
        try {
            const token = await this.registerForPushNotificationsAsync();
            if (token) {
                console.log('Updating server with FCM token...');
                await api.users.updateFcmToken(token);
                console.log('FCM token updated successfully');
            }
        } catch (error) {
            console.error('Failed to update FCM token:', error);
        }
    }

    // 알림 리스너 설정
    static addNotificationListeners(
        onNotificationReceived: (notification: Notifications.Notification) => void,
        onNotificationResponse: (response: Notifications.NotificationResponse) => void
    ) {
        const notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
        const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

        return () => {
            Notifications.removeNotificationSubscription(notificationListener);
            Notifications.removeNotificationSubscription(responseListener);
        };
    }
}
