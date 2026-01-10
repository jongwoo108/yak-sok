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

    const data = event.notification.data;
    let url = '/';

    // 데이터 타입에 따른 이동 경로 설정
    if (data) {
        if (data.type === 'medication_reminder') {
            url = '/'; // 복약 알림은 홈으로
        } else if (data.type === 'guardian_alert') {
            url = '/alerts'; // 보호자 알림은 알림 목록으로
        } else if (data.url) {
            url = data.url;
        }
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // 이미 열린 창이 있으면 포커스하고 URL 변경
            for (let client of windowClients) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    return client.focus().then((focusedClient) => {
                        return focusedClient.navigate(url);
                    });
                }
            }
            // 열린 창이 없으면 새 창 열기
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

