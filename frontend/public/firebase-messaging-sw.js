// Firebase Cloud Messaging Service Worker
// 백그라운드 푸시 알림 처리

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyD7D4t42O9KWwNCivF0DVMzzhpkTHrOa3I',
    authDomain: 'yak-sok.firebaseapp.com',
    projectId: 'yak-sok',
    storageBucket: 'yak-sok.firebasestorage.app',
    messagingSenderId: '272698632490',
    appId: '1:272698632490:web:9b636adfd6039e3fac5653',
});

const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] 백그라운드 메시지 수신:', payload);

    const notificationTitle = payload.notification?.title || '💊 약속';
    const notificationOptions = {
        body: payload.notification?.body || '알림이 도착했습니다.',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        data: payload.data,
        actions: [
            { action: 'open', title: '확인하기' },
            { action: 'close', title: '닫기' }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] 알림 클릭:', event.action);
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
