'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MedicationCard } from '@/components/MedicationCard';
import { useMedicationStore } from '@/services/store';

export default function HomePage() {
    const { todayLogs, fetchTodayLogs, isLoading } = useMedicationStore();

    useEffect(() => {
        fetchTodayLogs();
    }, [fetchTodayLogs]);

    return (
        <div className="container min-h-screen p-6">
            {/* 헤더 */}
            <header className="mb-6 text-center">
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                    💊 오늘의 약속
                </h1>
                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-light)' }}>
                    {new Date().toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                    })}
                </p>
            </header>

            {/* 복약 카드 목록 */}
            <section className="flex flex-col gap-4 mb-6">
                {isLoading ? (
                    <div className="card text-center">
                        <p style={{ fontSize: 'var(--font-size-lg)' }}>로딩 중...</p>
                    </div>
                ) : todayLogs.length === 0 ? (
                    <div className="card text-center">
                        <p style={{ fontSize: 'var(--font-size-lg)' }}>
                            오늘 복용할 약이 없습니다.
                        </p>
                        <Link href="/medications/add" className="btn btn-primary w-full" style={{ marginTop: '1rem' }}>
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
                <Link href="/medications" className="btn btn-primary w-full">
                    💊 내 약 목록
                </Link>
                <Link href="/profile" className="btn" style={{
                    background: 'var(--color-surface)',
                    border: '2px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                    flex: 1
                }}>
                    👤 설정
                </Link>
            </nav>
        </div>
    );
}
