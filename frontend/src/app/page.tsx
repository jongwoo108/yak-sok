'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Pill, List, Settings, PartyPopper, Loader2 } from 'lucide-react';
import { MedicationCard } from '@/components/MedicationCard';
import { useMedicationStore } from '@/services/store';

export default function HomePage() {
    const { todayLogs, fetchTodayLogs, isLoading } = useMedicationStore();

    useEffect(() => {
        fetchTodayLogs();
    }, [fetchTodayLogs]);

    const completedCount = todayLogs.filter(log => log.status === 'taken').length;
    const totalCount = todayLogs.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <>
            {/* 유기적 배경 그라데이션 */}
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

                    {/* 복약 카드 목록 */}
                    <section className="flex flex-col gap-4">
                        {isLoading ? (
                            <div className="card text-center">
                                <div className="status-icon status-icon-pending" style={{ margin: '0 auto 1rem' }}>
                                    <Loader2 size={28} style={{ color: 'var(--color-text-light)' }} />
                                </div>
                                <p style={{ fontSize: 'var(--font-size-lg)' }}>로딩 중...</p>
                            </div>
                        ) : todayLogs.length === 0 ? (
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
                                <Link href="/medications/add" className="btn btn-primary">
                                    <Pill size={20} />
                                    약 추가하기
                                </Link>
                            </div>
                        ) : (
                            todayLogs.map((log) => (
                                <MedicationCard key={log.id} log={log} />
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

