'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pill, Sun, Sunrise, Sunset, Moon, Check, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night';

interface Schedule {
    time_of_day: TimeOfDay;
    scheduled_time: string;
}

const TIME_OPTIONS: { value: TimeOfDay; label: string; defaultTime: string; icon: React.ReactNode }[] = [
    { value: 'morning', label: '아침', defaultTime: '08:00', icon: <Sunrise size={24} /> },
    { value: 'noon', label: '점심', defaultTime: '12:00', icon: <Sun size={24} /> },
    { value: 'evening', label: '저녁', defaultTime: '18:00', icon: <Sunset size={24} /> },
    { value: 'night', label: '취침 전', defaultTime: '22:00', icon: <Moon size={24} /> },
];

export default function AddMedicationPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        dosage: '',
    });

    const [selectedTimes, setSelectedTimes] = useState<Record<TimeOfDay, boolean>>({
        morning: false,
        noon: false,
        evening: false,
        night: false,
    });

    const handleTimeToggle = (time: TimeOfDay) => {
        setSelectedTimes(prev => ({
            ...prev,
            [time]: !prev[time],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 최소 하나의 시간 선택 확인
        const hasTime = Object.values(selectedTimes).some(v => v);
        if (!hasTime) {
            setError('복용 시간을 최소 하나 이상 선택해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            // 약 등록
            const medicationResponse = await api.medications.create(formData);
            const medicationId = medicationResponse.data.id;

            // 스케줄 등록
            const schedules: Schedule[] = [];
            TIME_OPTIONS.forEach(option => {
                if (selectedTimes[option.value]) {
                    schedules.push({
                        time_of_day: option.value,
                        scheduled_time: option.defaultTime,
                    });
                }
            });

            router.push('/medications');
        } catch (err: any) {
            setError(err.response?.data?.detail || '약 등록에 실패했습니다.');
        } finally {
            setIsLoading(false);
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
                            href="/medications"
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
                            약 추가하기
                        </h1>
                        <div style={{ width: '44px' }} />
                    </header>

                    {/* 폼 */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {error && (
                            <div style={{
                                padding: '1rem',
                                marginBottom: '1rem',
                                background: 'var(--color-pink-light)',
                                color: 'var(--color-danger)',
                                borderRadius: 'var(--border-radius)',
                                fontSize: 'var(--font-size-base)',
                            }}>
                                {error}
                            </div>
                        )}

                        <div className="card mb-6">
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: 'var(--font-size-lg)',
                                    fontWeight: 600,
                                }}>
                                    약 이름 *
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="예: 혈압약, 당뇨약"
                                    required
                                    style={{ fontSize: 'var(--font-size-lg)' }}
                                />
                            </div>

                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: 'var(--font-size-lg)',
                                    fontWeight: 600,
                                }}>
                                    복용량
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.dosage}
                                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                    placeholder="예: 1정, 2알"
                                    style={{ fontSize: 'var(--font-size-lg)' }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontSize: 'var(--font-size-lg)',
                                    fontWeight: 600,
                                }}>
                                    복용 설명 (선택)
                                </label>
                                <textarea
                                    className="input"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="복용 시 주의사항 등"
                                    rows={3}
                                    style={{
                                        fontSize: 'var(--font-size-base)',
                                        resize: 'none',
                                    }}
                                />
                            </div>
                        </div>

                        {/* 복용 시간 선택 */}
                        <div className="card mb-6">
                            <label style={{
                                display: 'block',
                                marginBottom: '1rem',
                                fontSize: 'var(--font-size-lg)',
                                fontWeight: 600,
                            }}>
                                복용 시간 *
                            </label>
                            <div className="flex flex-col gap-4">
                                {TIME_OPTIONS.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleTimeToggle(option.value)}
                                        className="btn w-full"
                                        style={{
                                            justifyContent: 'space-between',
                                            background: selectedTimes[option.value]
                                                ? 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint) 100%)'
                                                : 'var(--color-cream)',
                                            color: selectedTimes[option.value] ? 'white' : 'var(--color-text)',
                                            border: 'none',
                                            boxShadow: selectedTimes[option.value]
                                                ? '0 4px 12px rgba(123, 196, 154, 0.4)'
                                                : 'var(--shadow-neumorphic)',
                                        }}
                                    >
                                        <span style={{ fontSize: 'var(--font-size-lg)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {option.icon}
                                            {option.label}
                                        </span>
                                        <span style={{ fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {option.defaultTime}
                                            {selectedTimes[option.value] && <Check size={20} />}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 제출 버튼 */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full"
                            style={{ fontSize: 'var(--font-size-xl)', minHeight: '64px' }}
                        >
                            {isLoading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <>
                                    <Check size={24} />
                                    약 등록하기
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

