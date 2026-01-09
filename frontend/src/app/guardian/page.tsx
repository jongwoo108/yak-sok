'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMedicationStore } from '@/services/store';
import { api } from '@/services/api';
import type { Alert, MedicationLog } from '@/services/types';

interface SeniorStatus {
    senior_id: number;
    senior_name: string;
    today_logs: MedicationLog[];
    pending_alerts: Alert[];
    completion_rate: number;
}

export default function GuardianDashboardPage() {
    const { user, fetchUser, isLoading } = useMedicationStore();
    const [seniors, setSeniors] = useState<SeniorStatus[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    useEffect(() => {
        if (user?.role === 'guardian') {
            fetchSeniorsData();
        }
    }, [user]);

    const fetchSeniorsData = async () => {
        setLoadingData(true);
        try {
            // 보호자가 관리하는 시니어들의 복약 현황 조회
            // TODO: 실제 API 연동
            // 현재는 더미 데이터
            setSeniors([
                {
                    senior_id: 1,
                    senior_name: '어머니',
                    today_logs: [
                        {
                            id: 1,
                            schedule: 1,
                            medication_name: '혈압약',
                            scheduled_datetime: new Date().toISOString(),
                            taken_datetime: new Date().toISOString(),
                            status: 'taken',
                            status_display: '복용 완료',
                            notes: '',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                        {
                            id: 2,
                            schedule: 2,
                            medication_name: '당뇨약',
                            scheduled_datetime: new Date(Date.now() + 3600000).toISOString(),
                            taken_datetime: null,
                            status: 'pending',
                            status_display: '대기 중',
                            notes: '',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                    ],
                    pending_alerts: [],
                    completion_rate: 50,
                },
            ]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };

    if (isLoading || loadingData) {
        return (
            <div className="container min-h-screen flex items-center justify-center p-6">
                <div className="card text-center">
                    <p style={{ fontSize: 'var(--font-size-lg)' }}>로딩 중...</p>
                </div>
            </div>
        );
    }

    if (user?.role !== 'guardian') {
        return (
            <div className="container min-h-screen flex items-center justify-center p-6">
                <div className="card text-center">
                    <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: '1rem' }}>
                        보호자 전용 페이지입니다.
                    </p>
                    <Link href="/" className="btn btn-primary">
                        홈으로 가기
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container min-h-screen p-6">
            {/* 헤더 */}
            <header className="mb-6">
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                    👨‍👩‍👧 보호자 대시보드
                </h1>
                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-light)' }}>
                    {user.first_name || user.username}님, 안녕하세요!
                </p>
            </header>

            {/* 시니어 현황 카드 */}
            {seniors.length === 0 ? (
                <div className="card text-center">
                    <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: '1rem' }}>
                        연결된 시니어가 없습니다.
                    </p>
                    <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-light)' }}>
                        시니어 계정에서 보호자로 등록해주세요.
                    </p>
                </div>
            ) : (
                seniors.map((senior) => (
                    <div key={senior.senior_id} className="card mb-6">
                        {/* 시니어 헤더 */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            paddingBottom: '1rem',
                            borderBottom: '1px solid #E5E7EB',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 'var(--font-size-xl)',
                                    marginRight: '1rem',
                                }}>
                                    👴
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                                        {senior.senior_name}
                                    </h2>
                                    <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-light)' }}>
                                        오늘 복약률
                                    </p>
                                </div>
                            </div>

                            {/* 복약률 원형 */}
                            <div style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '50%',
                                background: senior.completion_rate >= 80
                                    ? 'var(--color-success)'
                                    : senior.completion_rate >= 50
                                        ? 'var(--color-warning)'
                                        : 'var(--color-danger)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'var(--font-size-lg)',
                                fontWeight: 700,
                            }}>
                                {senior.completion_rate}%
                            </div>
                        </div>

                        {/* 오늘의 복약 현황 */}
                        <h3 style={{
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 600,
                            marginBottom: '0.5rem',
                            color: 'var(--color-text-light)',
                        }}>
                            오늘의 복약
                        </h3>

                        {senior.today_logs.map((log) => (
                            <div
                                key={log.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem',
                                    marginBottom: '0.5rem',
                                    background: '#F9FAFB',
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${log.status === 'taken'
                                            ? 'var(--color-success)'
                                            : log.status === 'missed'
                                                ? 'var(--color-danger)'
                                                : 'var(--color-warning)'
                                        }`,
                                }}
                            >
                                <div>
                                    <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                        {log.medication_name}
                                    </p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                        {new Date(log.scheduled_datetime).toLocaleTimeString('ko-KR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '999px',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    background: log.status === 'taken'
                                        ? '#DCFCE7'
                                        : log.status === 'missed'
                                            ? '#FEE2E2'
                                            : '#FEF3C7',
                                    color: log.status === 'taken'
                                        ? 'var(--color-success)'
                                        : log.status === 'missed'
                                            ? 'var(--color-danger)'
                                            : 'var(--color-warning)',
                                }}>
                                    {log.status_display}
                                </span>
                            </div>
                        ))}

                        {/* 긴급 연락 버튼 */}
                        <button
                            onClick={() => window.location.href = `tel:010-0000-0000`}
                            className="btn w-full"
                            style={{
                                marginTop: '1rem',
                                background: '#FEE2E2',
                                color: 'var(--color-danger)',
                                border: 'none',
                            }}
                        >
                            📞 {senior.senior_name}에게 전화하기
                        </button>
                    </div>
                ))
            )}

            {/* 하단 네비게이션 */}
            <nav className="flex gap-4">
                <Link href="/" className="btn w-full" style={{
                    background: 'var(--color-surface)',
                    border: '2px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                }}>
                    🏠 홈
                </Link>
                <Link href="/profile" className="btn w-full" style={{
                    background: 'var(--color-surface)',
                    border: '2px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                }}>
                    👤 설정
                </Link>
            </nav>
        </div>
    );
}
