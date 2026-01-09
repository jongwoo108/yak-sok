'use client';

import { useState } from 'react';
import { Check, Clock, Loader2 } from 'lucide-react';
import { useMedicationStore } from '@/services/store';
import type { MedicationLog } from '@/services/types';

interface MedicationCardProps {
    log: MedicationLog;
}

export function MedicationCard({ log }: MedicationCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { takeMedication } = useMedicationStore();

    const handleTake = async () => {
        if (log.status === 'taken' || isLoading) return;

        setIsLoading(true);
        try {
            await takeMedication(log.id);
        } finally {
            setIsLoading(false);
        }
    };

    const isTaken = log.status === 'taken';

    return (
        <div
            className="card"
            style={{
                position: 'relative',
                overflow: 'hidden',
                opacity: isTaken ? 0.85 : 1,
            }}
        >
            {/* 상태 표시 바 */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: isTaken
                        ? 'linear-gradient(90deg, var(--color-mint) 0%, var(--color-mint-dark) 100%)'
                        : 'linear-gradient(90deg, var(--color-pink-light) 0%, var(--color-pink) 100%)',
                    borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) 0 0',
                }}
            />

            <div className="flex items-center" style={{ justifyContent: 'space-between', gap: '1rem' }}>
                {/* 약 정보 */}
                <div style={{ flex: 1 }}>
                    <h2 style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 700,
                        marginBottom: '0.25rem',
                        color: 'var(--color-text)',
                    }}>
                        {log.medication_name}
                    </h2>
                    <p style={{
                        fontSize: 'var(--font-size-lg)',
                        color: 'var(--color-text-light)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        <Clock size={18} />
                        {new Date(log.scheduled_datetime).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>

                {/* 상태 아이콘 또는 버튼 */}
                {isTaken ? (
                    <div className="status-icon status-icon-success">
                        <Check size={28} strokeWidth={3} />
                    </div>
                ) : (
                    <button
                        onClick={handleTake}
                        disabled={isLoading}
                        className="btn btn-primary"
                        style={{
                            padding: 'var(--spacing-md) var(--spacing-lg)',
                            fontSize: 'var(--font-size-base)',
                            minWidth: '100px',
                        }}
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : '복용'}
                    </button>
                )}
            </div>

            {/* 복용 완료 메시지 */}
            {isTaken && log.taken_datetime && (
                <p style={{
                    marginTop: '0.75rem',
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-mint-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}>
                    <Check size={16} />
                    {new Date(log.taken_datetime).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}에 복용 완료
                </p>
            )}
        </div>
    );
}
