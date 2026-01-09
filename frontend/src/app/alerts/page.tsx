'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, AlertTriangle, AlertCircle, Pill, Loader2 } from 'lucide-react';
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
                return {
                    bg: 'var(--color-pink-light)',
                    color: 'var(--color-danger)',
                    icon: <AlertCircle size={24} />
                };
            case 'warning':
                return {
                    bg: 'var(--color-cream)',
                    color: 'var(--color-warning)',
                    icon: <AlertTriangle size={24} />
                };
            default:
                return {
                    bg: 'var(--color-mint-light)',
                    color: 'var(--color-mint-dark)',
                    icon: <Pill size={24} />
                };
        }
    };

    const getStatusStyle = (status: Alert['status']) => {
        switch (status) {
            case 'sent':
                return { bg: 'var(--color-mint-light)', color: 'var(--color-mint-dark)' };
            case 'cancelled':
                return { bg: 'var(--color-cream)', color: 'var(--color-text-light)' };
            case 'failed':
                return { bg: 'var(--color-pink-light)', color: 'var(--color-danger)' };
            default:
                return { bg: 'var(--color-cream)', color: 'var(--color-warning)' };
        }
    };

    return (
        <>
            <div className="organic-bg" />
            <div className="page-wrapper">
                <div className="page-content">
                    {/* 헤더 */}
                    <header className="flex items-center" style={{ justifyContent: 'space-between' }}>
                        <Link
                            href="/"
                            className="status-icon"
                            style={{
                                width: '44px',
                                height: '44px',
                                background: 'var(--color-cream)',
                            }}
                        >
                            <ArrowLeft size={22} color="var(--color-text)" />
                        </Link>
                        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bell size={24} color="var(--color-mint-dark)" />
                            알림 내역
                        </h1>
                        <div style={{ width: '44px' }} />
                    </header>

                    {/* 알림 목록 */}
                    <section className="flex flex-col gap-4">
                        {isLoading ? (
                            <div className="card text-center">
                                <div className="status-icon status-icon-pending" style={{ margin: '0 auto 1rem' }}>
                                    <Loader2 size={28} style={{ color: 'var(--color-text-light)' }} />
                                </div>
                                <p style={{ fontSize: 'var(--font-size-lg)' }}>로딩 중...</p>
                            </div>
                        ) : alerts.length === 0 ? (
                            <div className="card text-center">
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    marginBottom: '1rem'
                                }}>
                                    <div className="status-icon" style={{
                                        width: '80px',
                                        height: '80px',
                                        background: 'var(--color-cream)',
                                    }}>
                                        <Bell size={36} color="var(--color-text-light)" />
                                    </div>
                                </div>
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
                                            position: 'relative',
                                            overflow: 'hidden',
                                            opacity: alert.status === 'cancelled' ? 0.6 : 1,
                                        }}
                                    >
                                        {/* 상태 바 */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: '4px',
                                                background: alertStyle.color,
                                                borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) 0 0',
                                            }}
                                        />
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '0.5rem',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{
                                                    marginRight: '0.75rem',
                                                    color: alertStyle.color,
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
                                                borderRadius: 'var(--border-radius-pill)',
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
            </div>
        </>
    );
}

