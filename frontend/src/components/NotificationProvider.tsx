'use client';

/**
 * NotificationProvider
 * 앱 전역에서 FCM 토큰 관리 및 알림 수신 처리
 */

import { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/services/firebase';
import { apiClient } from '@/services/api';

interface NotificationPayload {
    notification?: {
        title?: string;
        body?: string;
    };
    data?: Record<string, string>;
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [permission, setPermission] = useState<NotificationPermission | null>(null);

    useEffect(() => {
        // 브라우저 알림 권한 확인
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    useEffect(() => {
        // 서비스 워커 등록
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/firebase-messaging-sw.js')
                .then((registration) => {
                    console.log('Service Worker 등록 성공:', registration.scope);
                })
                .catch((error) => {
                    console.error('Service Worker 등록 실패:', error);
                });
        }
    }, []);

    useEffect(() => {
        // 포그라운드 메시지 리스너
        onMessageListener((payload: NotificationPayload) => {
            // 브라우저 알림 표시
            if (Notification.permission === 'granted' && payload.notification) {
                new Notification(payload.notification.title || '💊 약속', {
                    body: payload.notification.body,
                    icon: '/icon-192x192.png',
                });
            }
        });
    }, []);

    // 알림 관련 로직은 홈페이지 토글로 이동됨
    // 이 컴포넌트는 서비스 워커 등록과 포그라운드 메시지 수신만 담당

    return <>{children}</>;
}
