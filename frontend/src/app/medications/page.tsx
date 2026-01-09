'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useMedicationStore } from '@/services/store';

export default function MedicationsPage() {
    const { medications, fetchMedications, isLoading } = useMedicationStore();

    useEffect(() => {
        fetchMedications();
    }, [fetchMedications]);

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
                    💊 내 약 목록
                </h1>
                <div style={{ width: '40px' }} />
            </header>

            {/* 약 목록 */}
            <section className="flex flex-col gap-4 mb-6">
                {isLoading ? (
                    <div className="card text-center">
                        <p style={{ fontSize: 'var(--font-size-lg)' }}>로딩 중...</p>
                    </div>
                ) : medications.length === 0 ? (
                    <div className="card text-center">
                        <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: '1rem' }}>
                            등록된 약이 없습니다.
                        </p>
                        <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-light)' }}>
                            아래 버튼을 눌러 약을 추가해보세요.
                        </p>
                    </div>
                ) : (
                    medications.map((medication) => (
                        <div key={medication.id} className="card">
                            <div className="flex items-center" style={{ justifyContent: 'space-between' }}>
                                <div>
                                    <h2 style={{
                                        fontSize: 'var(--font-size-xl)',
                                        fontWeight: 700,
                                        marginBottom: '0.5rem',
                                    }}>
                                        {medication.name}
                                    </h2>
                                    {medication.dosage && (
                                        <p style={{
                                            fontSize: 'var(--font-size-base)',
                                            color: 'var(--color-text-light)',
                                        }}>
                                            {medication.dosage}
                                        </p>
                                    )}
                                    {medication.description && (
                                        <p style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-light)',
                                            marginTop: '0.5rem',
                                        }}>
                                            {medication.description}
                                        </p>
                                    )}
                                </div>
                                <div style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--border-radius)',
                                    background: medication.is_active ? '#DCFCE7' : '#FEE2E2',
                                    color: medication.is_active ? 'var(--color-success)' : 'var(--color-danger)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                }}>
                                    {medication.is_active ? '복용 중' : '중단'}
                                </div>
                            </div>

                            {/* 복용 시간 */}
                            {medication.schedules && medication.schedules.length > 0 && (
                                <div style={{
                                    marginTop: '1rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid #E5E7EB',
                                }}>
                                    <p style={{
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-text-light)',
                                        marginBottom: '0.5rem',
                                    }}>
                                        복용 시간
                                    </p>
                                    <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                                        {medication.schedules.map((schedule) => (
                                            <span
                                                key={schedule.id}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#EEF2FF',
                                                    color: 'var(--color-primary)',
                                                    borderRadius: '8px',
                                                    fontSize: 'var(--font-size-base)',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {schedule.time_of_day_display} {schedule.scheduled_time.slice(0, 5)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </section>

            {/* 약 추가 버튼 */}
            <div className="flex flex-col gap-4">
                <Link href="/medications/add" className="btn btn-primary w-full">
                    ➕ 직접 약 추가하기
                </Link>
                <Link href="/medications/scan" className="btn w-full" style={{
                    background: 'var(--color-surface)',
                    border: '2px solid var(--color-primary)',
                    color: 'var(--color-primary)',
                }}>
                    📷 처방전 스캔으로 추가
                </Link>
            </div>
        </div>
    );
}
