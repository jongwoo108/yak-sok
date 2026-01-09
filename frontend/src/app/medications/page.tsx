'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pill, Plus, Camera, Clock, Loader2 } from 'lucide-react';
import { useMedicationStore } from '@/services/store';

export default function MedicationsPage() {
    const { medications, fetchMedications, isLoading } = useMedicationStore();

    useEffect(() => {
        fetchMedications();
    }, [fetchMedications]);

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
                            <Pill size={24} color="var(--color-mint-dark)" />
                            내 약 목록
                        </h1>
                        <div style={{ width: '44px' }} />
                    </header>

                    {/* 약 목록 */}
                    <section className="flex flex-col gap-4">
                        {isLoading ? (
                            <div className="card text-center">
                                <div className="status-icon status-icon-pending" style={{ margin: '0 auto 1rem' }}>
                                    <Loader2 size={28} style={{ color: 'var(--color-text-light)' }} />
                                </div>
                                <p style={{ fontSize: 'var(--font-size-lg)' }}>로딩 중...</p>
                            </div>
                        ) : medications.length === 0 ? (
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
                                        <Pill size={36} color="var(--color-text-light)" />
                                    </div>
                                </div>
                                <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: '1rem' }}>
                                    등록된 약이 없습니다.
                                </p>
                                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-light)' }}>
                                    아래 버튼을 눌러 약을 추가해보세요.
                                </p>
                            </div>
                        ) : (
                            medications.map((medication) => (
                                <div key={medication.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                                    {/* 상태 바 */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '4px',
                                            background: medication.is_active
                                                ? 'linear-gradient(90deg, var(--color-mint) 0%, var(--color-mint-dark) 100%)'
                                                : 'linear-gradient(90deg, var(--color-pink-light) 0%, var(--color-pink) 100%)',
                                            borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) 0 0',
                                        }}
                                    />
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
                                            borderRadius: 'var(--border-radius-pill)',
                                            background: medication.is_active
                                                ? 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint) 100%)'
                                                : 'var(--color-pink-light)',
                                            color: medication.is_active ? 'white' : 'var(--color-danger)',
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
                                            borderTop: '1px solid var(--color-cream-dark)',
                                        }}>
                                            <p style={{
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--color-text-light)',
                                                marginBottom: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                            }}>
                                                <Clock size={16} />
                                                복용 시간
                                            </p>
                                            <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                                                {medication.schedules.map((schedule) => (
                                                    <span
                                                        key={schedule.id}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            background: 'var(--color-mint-light)',
                                                            color: 'var(--color-mint-dark)',
                                                            borderRadius: 'var(--border-radius-pill)',
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
                            <Plus size={20} />
                            직접 약 추가하기
                        </Link>
                        <Link href="/medications/scan" className="btn w-full" style={{
                            background: 'var(--color-cream)',
                            color: 'var(--color-text)',
                        }}>
                            <Camera size={20} />
                            처방전 스캔으로 추가
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
