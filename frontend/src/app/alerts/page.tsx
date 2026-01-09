'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useMedicationStore } from '@/services/store';
import type { Alert } from '@/services/types';

export default function AlertsPage() {
    const { alerts, fetchAlerts, isLoading } = useMedicationStore();

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const getAlertStyle = (alertType: Alert['alert_type']) => {
        switch (alertType) {
            case 'emergency':
                return { bg: '#FEE2E2', color: 'var(--color-danger)', icon: '🚨' };
            case 'warning':
                return { bg: '#FEF3C7', color: 'var(--color-warning)', icon: '⚠️' };
            default:
                return { bg: '#EEF2FF', color: 'var(--color-primary)', icon: '💊' };
        }
    };

    const getStatusStyle = (status: Alert['status']) => {
        switch (status) {
            case 'sent':
                return { bg: '#DCFCE7', color: 'var(--color-success)' };
            case 'cancelled':
                return { bg: '#F3F4F6', color: 'var(--color-text-light)' };
            case 'failed':
                return { bg: '#FEE2E2', color: 'var(--color-danger)' };
            default:
                return { bg: '#FEF3C7', color: 'var(--color-warning)' };
        }
    };

    return (
        <div className="container min-h-screen p-6">
            {/* 헤더 */}
            <header className="flex items-center mb-6" style={{ justifyContent: 'space-between' }}>
                <Link
                    href="/"
                    style={{
                        fontSize: 'var(--font-size-xl)',
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                    }}
                >
                    ←
                </Link>
                <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                    🔔 알림 내역
                </h1>
                <div style={{ width: '40px' }} />
            </header>

            {/* 알림 목록 */}
            <section className="flex flex-col gap-4">
                {isLoading ? (
                    <div className="card text-center">
                        <p style={{ fontSize: 'var(--font-size-lg)' }}>로딩 중...</p>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="card text-center">
                        <p style={{ fontSize: 'var(--font-size-lg)' }}>
                            알림 내역이 없습니다.
                        </p>
                    </div>
                ) : (
                    alerts.map((alert) => {
                        const alertStyle = getAlertStyle(alert.alert_type);
                        const statusStyle = getStatusStyle(alert.status);

                        return (
                            <div
                                key={alert.id}
                                className="card"
                                style={{
                                    borderLeft: `4px solid ${alertStyle.color}`,
                                    opacity: alert.status === 'cancelled' ? 0.6 : 1,
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '0.5rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: 'var(--font-size-xl)',
                                            marginRight: '0.5rem',
                                        }}>
                                            {alertStyle.icon}
                                        </span>
                                        <div>
                                            <h3 style={{
                                                fontSize: 'var(--font-size-lg)',
                                                fontWeight: 700,
                                            }}>
                                                {alert.title}
                                            </h3>
                                            <span style={{
                                                fontSize: 'var(--font-size-sm)',
                                                color: alertStyle.color,
                                            }}>
                                                {alert.alert_type_display}
                                            </span>
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '999px',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 600,
                                        background: statusStyle.bg,
                                        color: statusStyle.color,
                                    }}>
                                        {alert.status_display}
                                    </span>
                                </div>

                                <p style={{
                                    fontSize: 'var(--font-size-base)',
                                    color: 'var(--color-text)',
                                    marginBottom: '0.5rem',
                                }}>
                                    {alert.message}
                                </p>

                                <div style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-text-light)',
                                }}>
                                    <span>예정: {new Date(alert.scheduled_at).toLocaleString('ko-KR')}</span>
                                    {alert.sent_at && (
                                        <span> · 발송: {new Date(alert.sent_at).toLocaleString('ko-KR')}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </section>
        </div>
    );
}
