'use client';

/**
 * NotificationProvider
 * 앱 전역에서 FCM 토큰 관리 및 알림 수신 처리
 * 포그라운드 알림 수신 시 Toast UI 표시 및 데이터 갱신
 */

import { useEffect, useState } from 'react';
import { onMessageListener } from '@/services/firebase';
import { useMedicationStore } from '@/services/store';
import { X, Check, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NotificationPayload {
    notification?: {
        title?: string;
        body?: string;
    };
    data?: Record<string, string>;
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<{ visible: boolean; title: string; body: string; data?: any } | null>(null);
    const { fetchTodayLogs, fetchAlerts, takeMedication } = useMedicationStore();
    const router = useRouter();

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
            console.log('[NotificationProvider] 포그라운드 알림 수신:', payload);

            // 1. 데이터 갱신
            fetchTodayLogs(); // 오늘의 복약 기록 갱신
            fetchAlerts();    // 알림 목록 갱신

            // 2. Toast 표시
            if (payload.notification) {
                setToast({
                    visible: true,
                    title: payload.notification.title || '알림',
                    body: payload.notification.body || '',
                    data: payload.data
                });

                // 3초 후 자동 닫기 (옵션)
                // setTimeout(() => setToast(null), 5000);
            }
        });
    }, [fetchTodayLogs, fetchAlerts]);

    const handleClose = () => {
        setToast(null);
    };

    const handleAction = async () => {
        if (!toast) return;

        // 알림 클릭 시 동작
        if (toast.data?.type === 'medication_reminder' || toast.data?.type === 'guardian_alert') {
            // 해당 복약/알림 상세로 이동하거나 처리
            // 예: 복약 알림인 경우 홈으로 이동
            router.push('/');
        }

        // TODO: '복용하기' 등의 직접 액션 처리도 가능
        // if (toast.data?.log_id) { await takeMedication(toast.data.log_id); }

        setToast(null);
    };

    const getToastStyles = (severity?: string) => {
        switch (severity) {
            case 'emergency':
                return {
                    container: 'toast-emergency',
                    title: 'toast-title-emergency',
                    body: 'toast-body-emergency',
                    icon: <div className="toast-icon toast-icon-emergency"><AlertCircle size={24} /></div>
                };
            case 'warning':
                return {
                    container: 'toast-warning',
                    title: 'toast-title-warning',
                    body: 'toast-body-warning',
                    icon: <div className="toast-icon toast-icon-warning"><AlertTriangle size={24} /></div>
                };
            default: // reminder or info
                return {
                    container: 'toast-info',
                    title: 'toast-title-info',
                    body: 'toast-body-info',
                    icon: <div className="toast-icon toast-icon-info"><Info size={24} /></div>
                };
        }
    };

    const styles = toast ? getToastStyles(toast.data?.severity) : null;

    return (
        <>
            {children}

            {/* Custom Toast UI */}
            {toast && styles && (
                <div
                    className={`toast ${styles.container}`}
                    onClick={handleAction}
                    role="alert"
                >
                    {styles.icon}
                    <div className="toast-content">
                        <h4 className={`toast-title ${styles.title}`}>
                            {toast.title}
                        </h4>
                        <p className={`toast-body ${styles.body}`}>
                            {toast.body}
                        </p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleClose(); }}
                        className="toast-close"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </>
    );
}


