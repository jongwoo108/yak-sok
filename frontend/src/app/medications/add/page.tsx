'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pill, Sun, Sunrise, Sunset, Moon, Check, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import ClayTimePicker from '@/components/ClayTimePicker';
import { useMedicationStore } from '@/services/store';

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

    // Store selected times as a map of TimeOfDay -> string (time) | null (not selected)
    const [schedules, setSchedules] = useState<Record<TimeOfDay, string | null>>({
        morning: null,
        noon: null,
        evening: null,
        night: null,
    });

    const handleTimeToggle = (time: TimeOfDay, defaultTime: string) => {
        setSchedules(prev => {
            const isSelected = prev[time] !== null;
            return {
                ...prev,
                [time]: isSelected ? null : defaultTime, // Toggle between null and default time
            };
        });
    };

    const handleTimeChange = (time: TimeOfDay, newTime: string) => {
        setSchedules(prev => ({
            ...prev,
            [time]: newTime,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 최소 하나의 시간 선택 확인
        const activeSchedules = Object.entries(schedules)
            .filter(([_, time]) => time !== null)
            .map(([key, time]) => ({
                time_of_day: key as TimeOfDay,
                scheduled_time: time!,
            }));

        if (activeSchedules.length === 0) {
            setError('복용 시간을 최소 하나 이상 선택해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            // 1. 약 등록
            const medicationResponse = await api.medications.create(formData);

            // 2. 스케줄 데이터 구성 및 전송 (API 스펙에 따라 구현 필요)
            // 현재는 UI 구현에 집중하고 있으므로, 데이터 전송 로직은
            // 백엔드가 스케줄을 함께 받거나, 별도 API가 필요할 수 있음을 상정합니다.
            // console.log('Registered Medication:', medicationResponse.data);
            // console.log('Schedules to register:', activeSchedules);

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
                    <header className="flex items-center justify-between mb-8">
                        <Link
                            href="/medications"
                            className="clay-btn-secondary"
                            style={{ width: '48px', height: '48px', padding: 0, borderRadius: '50%' }}
                        >
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-[var(--color-primary)] font-bold text-2xl flex items-center gap-2">
                            <Pill size={28} />
                            약 추가하기
                        </h1>
                        <div style={{ width: '48px' }} />
                    </header>

                    {/* 폼 */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <div className="clay-card">
                            <div className="clay-input-group">
                                <label className="clay-label">
                                    약 이름 *
                                </label>
                                <input
                                    type="text"
                                    className="clay-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="예: 혈압약, 당뇨약"
                                    required
                                />
                            </div>

                            <div className="clay-input-group">
                                <label className="clay-label">
                                    복용량
                                </label>
                                <input
                                    type="text"
                                    className="clay-input"
                                    value={formData.dosage}
                                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                    placeholder="예: 1정, 2알"
                                />
                            </div>

                            <div className="clay-input-group" style={{ marginBottom: 0 }}>
                                <label className="clay-label">
                                    복용 설명 (선택)
                                </label>
                                <textarea
                                    className="clay-input"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="복용 시 주의사항 등"
                                    rows={3}
                                    style={{ resize: 'none' }}
                                />
                            </div>
                        </div>

                        {/* 복용 시간 선택 */}
                        <div className="clay-card">
                            <label className="clay-label" style={{ marginBottom: '16px' }}>
                                복용 시간 *
                            </label>
                            <div className="grid-2-cols">
                                {TIME_OPTIONS.map(option => {
                                    const isSelected = schedules[option.value] !== null;
                                    return (
                                        <div
                                            key={option.value}
                                            className={`clay-select-btn ${isSelected ? 'active' : ''}`}
                                            style={{ padding: '16px', cursor: 'pointer' }}
                                            onClick={(e) => {
                                                // Prevent toggling if clicking strictly on the time input
                                                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                                                handleTimeToggle(option.value, option.defaultTime);
                                            }}
                                        >
                                            <div className="clay-select-icon">
                                                {option.icon}
                                            </div>
                                            <span style={{ marginBottom: isSelected ? '4px' : '0' }}>
                                                {option.label}
                                            </span>

                                            {isSelected && (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <ClayTimePicker
                                                        value={schedules[option.value]!}
                                                        onChange={(newTime) => handleTimeChange(option.value, newTime)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 제출 버튼 */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="clay-btn-primary"
                            style={{ minHeight: '64px', fontSize: '20px' }}
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
