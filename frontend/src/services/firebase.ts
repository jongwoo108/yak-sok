/**
 * Firebase Configuration
 * 웹 푸시 알림을 위한 Firebase 설정
 */

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: 'AIzaSyD7D4t42O9KWwNCivF0DVMzzhpkTHrOa3I',
    authDomain: 'yak-sok.firebaseapp.com',
    projectId: 'yak-sok',
    storageBucket: 'yak-sok.firebasestorage.app',
    messagingSenderId: '272698632490',
    appId: '1:272698632490:web:9b636adfd6039e3fac5653',
    measurementId: 'G-V6QYZVS2K0'
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Messaging instance (only in browser)
let messaging: Messaging | null = null;

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
        messaging = getMessaging(app);
    } catch (error) {
        console.error('Firebase Messaging 초기화 실패:', error);
    }
}

/**
 * FCM 토큰 요청
 * 알림 권한을 요청하고 FCM 토큰을 반환
 */
export async function requestNotificationPermission(): Promise<string | null> {
    console.log('[FCM] 토큰 요청 시작');

    if (!messaging) {
        console.warn('[FCM] Messaging이 지원되지 않는 환경입니다.');
        return null;
    }

    try {
        // 알림 권한 요청
        console.log('[FCM] 알림 권한 요청 중...');
        const permission = await Notification.requestPermission();
        console.log('[FCM] 알림 권한 결과:', permission);

        if (permission !== 'granted') {
            console.warn('[FCM] 알림 권한이 거부되었습니다.');
            return null;
        }

        // VAPID 키 확인
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        console.log('[FCM] VAPID 키:', vapidKey ? '설정됨' : '미설정');

        // FCM 토큰 요청
        const token = await getToken(messaging, {
            vapidKey: vapidKey
        });

        console.log('[FCM] 토큰 획득 성공:', token?.substring(0, 30) + '...');
        return token;

    } catch (error) {
        console.error('[FCM] 토큰 요청 실패:', error);
        return null;
    }
}

/**
 * 포그라운드 메시지 수신 리스너
 */
export function onMessageListener(callback: (payload: any) => void) {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
        console.log('포그라운드 메시지 수신:', payload);
        callback(payload);
    });
}

export { app, messaging };
