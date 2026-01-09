'use client';

import { useState } from 'react';
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
    const isPending = log.status === 'pending';

    return (
        <div
            className="card"
            style={{
                borderLeft: `6px solid ${isTaken ? 'var(--color-success)' : 'var(--color-warning)'}`,
                opacity: isTaken ? 0.7 : 1,
            }}
        >
            <div className="flex items-center" style={{ justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 700,
                        marginBottom: '0.5rem',
                    }}>
                        {log.medication_name}
                    </h2>
                    <p style={{
                        fontSize: 'var(--font-size-lg)',
                        color: 'var(--color-text-light)',
                    }}>
                        {new Date(log.scheduled_datetime).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>

                {isTaken ? (
                    <div
                        className="flex items-center justify-center"
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'var(--color-success)',
                            color: 'white',
                            fontSize: 'var(--font-size-xl)',
                        }}
                    >
                        ✓
                    </div>
                ) : (
                    <button
                        onClick={handleTake}
                        disabled={isLoading}
                        className="btn btn-primary"
                        style={{
                            width: '120px',
                            height: '80px',
                            fontSize: 'var(--font-size-lg)',
                        }}
                    >
                        {isLoading ? '...' : '복용 완료'}
                    </button>
                )}
            </div>

            {isTaken && log.taken_datetime && (
                <p style={{
                    marginTop: '1rem',
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-success)',
                }}>
                    ✓ {new Date(log.taken_datetime).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}에 복용 완료
                </p>
            )}
        </div>
    );
}
