'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pill, List, Settings, PartyPopper, Loader2, Package, Check, Bell, BellOff } from 'lucide-react';
import { useMedicationStore } from '@/services/store';
import { api } from '@/services/api';
import { requestNotificationPermission } from '@/services/firebase';
import { apiClient } from '@/services/api';

interface MedicationLog {
    id: number;
    medication_name: string;
    medication_dosage: string;
    group_id: number | null;
    group_name: string | null;
    time_of_day: string;
    time_of_day_display: string;
    scheduled_datetime: string;
    status: string;
}

interface GroupedLogs {
    key: string;
    group_id: number | null;
    group_name: string | null;
    time_of_day: string;
    time_of_day_display: string;
    logs: MedicationLog[];
    allTaken: boolean;
}

export default function HomePage() {
    const { todayLogs, fetchTodayLogs, isLoading } = useMedicationStore();
    const [takingGroup, setTakingGroup] = useState<string | null>(null);
    const [notificationEnabled, setNotificationEnabled] = useState<boolean>(false);
    const [notificationSupported, setNotificationSupported] = useState<boolean>(true);
    const [togglingNotification, setTogglingNotification] = useState(false);

    useEffect(() => {
        fetchTodayLogs();
        // 알림 권한 상태 확인
        if (typeof window !== 'undefined') {
            if ('Notification' in window) {
                setNotificationEnabled(Notification.permission === 'granted');
                setNotificationSupported(true);
            } else {
                // iOS Safari 등 Notification 미지원
                setNotificationSupported(false);
            }
        }
    }, [fetchTodayLogs]);

    // 알림 토글 핸들러
    const handleToggleNotification = async () => {
        if (togglingNotification) return;

        if (!notificationSupported) {
            alert('이 브라우저는 웹 알림을 지원하지 않습니다. 앱 설치 후 이용해주세요.');
            return;
        }

        setTogglingNotification(true);

        try {
            // 로그인 체크
            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                alert('알림 설정을 위해 로그인이 필요합니다.');
                setTogglingNotification(false);
                return;
            }

            if (!notificationEnabled) {
                console.log('[알림] 토큰 요청 시작...');
                const token = await requestNotificationPermission();
                console.log('[알림] 토큰:', token);
                if (token) {
                    await apiClient.patch('/users/update_fcm_token', { fcm_token: token });
                    setNotificationEnabled(true);
                    console.log('[알림] 활성화 완료');
                } else {
                    console.warn('[알림] 토큰 획득 실패');
                }
            } else {
                // 알림 끄기 (토큰 제거)
                await apiClient.patch('/users/update_fcm_token', { fcm_token: '' });
                setNotificationEnabled(false);
                console.log('[알림] 비활성화 완료');
            }
        } catch (error) {
            console.error('알림 설정 변경 실패:', error);
            alert('알림 설정 변경에 실패했습니다.');
        } finally {
            setTogglingNotification(false);
        }
    };

    // 그룹 + 시간대별로 로그 묶기
    const groupedLogs: GroupedLogs[] = [];
    const groupMap = new Map<string, GroupedLogs>();

    todayLogs.forEach((log: MedicationLog) => {
        // 그룹이 있으면 group_id + time_of_day로 키 생성, 없으면 log.id로 개별 처리
        const key = log.group_id
            ? `group_${log.group_id}_${log.time_of_day}`
            : `single_${log.id}`;

        if (!groupMap.has(key)) {
            groupMap.set(key, {
                key,
                group_id: log.group_id,
                group_name: log.group_name,
                time_of_day: log.time_of_day,
                time_of_day_display: log.time_of_day_display,
                logs: [],
                allTaken: true,
            });
        }

        const group = groupMap.get(key)!;
        group.logs.push(log);
        if (log.status !== 'taken') {
            group.allTaken = false;
        }
    });

    groupMap.forEach(group => groupedLogs.push(group));
    // 시간 순 정렬
    groupedLogs.sort((a, b) => {
        const timeOrder = { morning: 1, noon: 2, evening: 3, night: 4 };
        return (timeOrder[a.time_of_day as keyof typeof timeOrder] || 5) -
            (timeOrder[b.time_of_day as keyof typeof timeOrder] || 5);
    });

    const completedCount = todayLogs.filter((log: MedicationLog) => log.status === 'taken').length;
    const totalCount = todayLogs.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleTakeGroup = async (group: GroupedLogs) => {
        if (group.allTaken) return;

        setTakingGroup(group.key);
        try {
            const pendingLogIds = group.logs
                .filter(log => log.status !== 'taken')
                .map(log => log.id);

            await api.logs.batchTake(pendingLogIds);
            await fetchTodayLogs();
        } catch (err) {
            console.error('Failed to take medications', err);
        } finally {
            setTakingGroup(null);
        }
    };

    return (
        <>
            <div className="organic-bg" />
            <div className="page-wrapper">
                <div className="page-content">
                    {/* 헤더 */}
                    <header className="text-center">
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '0.75rem'
                        }}>
                            <div className="status-icon" style={{
                                background: 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint) 100%)',
                                width: '70px',
                                height: '70px',
                            }}>
                                <Pill size={32} color="white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <h1 className="header-title">
                            오늘의 약속
                        </h1>
                        <p className="header-subtitle">
                            {new Date().toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long',
                            })}
                        </p>
                    </header>

                    {/* 알림 설정 토글 */}
                    <div
                        className="card"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.25rem',
                            opacity: notificationSupported ? 1 : 0.5,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {notificationEnabled ? (
                                <Bell size={22} color="var(--color-mint-dark)" />
                            ) : (
                                <BellOff size={22} color="var(--color-text-light)" />
                            )}
                            <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 500 }}>
                                복약 알림
                            </span>
                        </div>
                        <button
                            onClick={handleToggleNotification}
                            disabled={togglingNotification}
                            style={{
                                width: '52px',
                                height: '28px',
                                borderRadius: '14px',
                                border: 'none',
                                background: notificationEnabled
                                    ? 'var(--color-mint)'
                                    : '#ddd',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                        >
                            <div style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'white',
                                position: 'absolute',
                                top: '3px',
                                left: notificationEnabled ? '27px' : '3px',
                                transition: 'left 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                            }} />
                        </button>
                    </div>

                    {/* 진행 상태 카드 */}
                    {totalCount > 0 && (
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                                    오늘의 복약
                                </span>
                                <span style={{
                                    fontSize: 'var(--font-size-xl)',
                                    fontWeight: 700,
                                    color: 'var(--color-mint-dark)'
                                }}>
                                    {completedCount}/{totalCount}
                                </span>
                            </div>
                            <div className="progress-bar">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* 복약 카드 목록 - 그룹별 표시 */}
                    <section className="flex flex-col gap-4">
                        {isLoading ? (
                            <div className="card text-center">
                                <div className="status-icon status-icon-pending" style={{ margin: '0 auto 1rem' }}>
                                    <Loader2 size={28} style={{ color: 'var(--color-text-light)' }} />
                                </div>
                                <p style={{ fontSize: 'var(--font-size-lg)' }}>로딩 중...</p>
                            </div>
                        ) : groupedLogs.length === 0 ? (
                            <div className="card text-center">
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    marginBottom: '1rem'
                                }}>
                                    <div className="status-icon status-icon-success" style={{
                                        width: '80px',
                                        height: '80px',
                                    }}>
                                        <PartyPopper size={36} color="white" />
                                    </div>
                                </div>
                                <p style={{
                                    fontSize: 'var(--font-size-lg)',
                                    marginBottom: '1rem'
                                }}>
                                    오늘 복용할 약이 없습니다
                                </p>
                                <Link href="/medications/scan" className="btn btn-primary">
                                    <Pill size={20} />
                                    처방전 스캔하기
                                </Link>
                            </div>
                        ) : (
                            groupedLogs.map((group) => (
                                <div
                                    key={group.key}
                                    className="card"
                                    style={{
                                        opacity: group.allTaken ? 0.6 : 1,
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    {/* 그룹 헤더 */}
                                    <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                                        <div className="flex items-center gap-2">
                                            {group.group_name ? (
                                                <>
                                                    <Package size={20} color="var(--color-mint-dark)" />
                                                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                                                        {group.group_name}
                                                    </span>
                                                </>
                                            ) : (
                                                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                                                    {group.logs[0]?.medication_name}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            background: 'var(--color-cream)',
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 600,
                                            color: 'var(--color-text-light)',
                                        }}>
                                            {group.time_of_day_display}
                                        </span>
                                    </div>

                                    {/* 약품 목록 */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        {group.logs.map((log, idx) => (
                                            <div
                                                key={log.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    padding: '0.5rem 0',
                                                    borderBottom: idx < group.logs.length - 1 ? '1px solid var(--color-cream)' : 'none',
                                                }}
                                            >
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    background: log.status === 'taken'
                                                        ? 'var(--color-mint)'
                                                        : 'var(--color-cream)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    {log.status === 'taken' && (
                                                        <Check size={14} color="white" />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{
                                                        fontWeight: 600,
                                                        textDecoration: log.status === 'taken' ? 'line-through' : 'none',
                                                        color: log.status === 'taken' ? 'var(--color-text-light)' : 'var(--color-text)',
                                                    }}>
                                                        {group.group_name ? log.medication_name : (log.medication_dosage || '')}
                                                    </p>
                                                    {group.group_name && log.medication_dosage && (
                                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                                            {log.medication_dosage}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 복용 완료 버튼 */}
                                    <button
                                        onClick={() => handleTakeGroup(group)}
                                        disabled={group.allTaken || takingGroup === group.key}
                                        className={`btn w-full ${group.allTaken ? '' : 'btn-primary'}`}
                                        style={{
                                            minHeight: '56px',
                                            fontSize: 'var(--font-size-lg)',
                                            background: group.allTaken ? 'var(--color-cream)' : undefined,
                                            color: group.allTaken ? 'var(--color-text-light)' : undefined,
                                        }}
                                    >
                                        {takingGroup === group.key ? (
                                            <Loader2 size={24} className="animate-spin" />
                                        ) : group.allTaken ? (
                                            <>
                                                <Check size={24} />
                                                복용 완료
                                            </>
                                        ) : (
                                            <>
                                                <Pill size={24} />
                                                {group.logs.length > 1
                                                    ? `${group.logs.length}개 약 한번에 복용하기`
                                                    : '복용 완료'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </section>

                    {/* 하단 네비게이션 */}
                    <nav className="flex gap-4">
                        <Link href="/medications" className="btn btn-primary" style={{ flex: 1 }}>
                            <List size={20} />
                            내 약 목록
                        </Link>
                        <Link href="/profile" className="btn" style={{ flex: 1 }}>
                            <Settings size={20} />
                            설정
                        </Link>
                    </nav>
                </div>
            </div>
        </>
    );
}
