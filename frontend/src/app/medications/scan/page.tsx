'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, Lightbulb, Search, Check, RefreshCw, Loader2, Clock, Plus, Package, X } from 'lucide-react';
import { api } from '@/services/api';
import { useMedicationStore } from '@/services/store';

// 기본 복용 시간 매핑
const TIME_PRESETS: { [key: string]: { time_of_day: string; scheduled_time: string } } = {
    '아침': { time_of_day: 'morning', scheduled_time: '08:00' },
    '점심': { time_of_day: 'noon', scheduled_time: '12:00' },
    '저녁': { time_of_day: 'evening', scheduled_time: '18:00' },
    '취침전': { time_of_day: 'night', scheduled_time: '22:00' },
    '취침 전': { time_of_day: 'night', scheduled_time: '22:00' },
};

interface MedicationScheduleEdit {
    time_of_day: string;
    scheduled_time: string;
    enabled: boolean;
}

interface MedicationEdit {
    name: string;
    dosage: string;
    description: string;
    schedules: MedicationScheduleEdit[];
    isDuplicate: boolean;
}

type Step = 'capture' | 'analyze' | 'edit';

export default function ScanPrescriptionPage() {
    const router = useRouter();
    const { medications: existingMedications, fetchMedications } = useMedicationStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<Step>('capture');
    const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [medicationsToEdit, setMedicationsToEdit] = useState<MedicationEdit[]>([]);
    const [symptom, setSymptom] = useState('');

    useEffect(() => {
        fetchMedications();
    }, [fetchMedications]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, { file, preview: reader.result as string }]);
            };
            reader.readAsDataURL(file);
            // 입력 초기화 (같은 파일 다시 선택 가능하도록)
            e.target.value = '';
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleAnalyzeAll = async () => {
        if (images.length === 0) {
            setError('이미지를 최소 1개 이상 선택해주세요.');
            return;
        }

        setIsLoading(true);
        setError('');
        setStep('analyze');

        try {
            const allMedications: MedicationEdit[] = [];
            let detectedSymptom = '';

            // 모든 이미지를 순차적으로 분석
            for (const image of images) {
                const response = await api.medications.scanPrescription(image.file);
                const result = response.data;

                // 첫 번째로 감지된 증상 사용
                if (!detectedSymptom && result.symptom) {
                    detectedSymptom = result.symptom;
                }

                // 약품 추가
                const meds: MedicationEdit[] = result.medications?.map((med: any) => {
                    const isDuplicate = existingMedications.some(existing => existing.name === med.name) ||
                        allMedications.some(existing => existing.name === med.name);

                    const schedules: MedicationScheduleEdit[] = [];
                    if (med.times && Array.isArray(med.times)) {
                        med.times.forEach((timeStr: string) => {
                            const preset = TIME_PRESETS[timeStr];
                            if (preset) {
                                schedules.push({
                                    time_of_day: preset.time_of_day,
                                    scheduled_time: preset.scheduled_time,
                                    enabled: true,
                                });
                            }
                        });
                    }

                    if (schedules.length === 0) {
                        schedules.push({
                            time_of_day: 'morning',
                            scheduled_time: '08:00',
                            enabled: true,
                        });
                    }

                    return {
                        name: med.name,
                        dosage: med.dosage || '',
                        description: med.description || med.frequency || '',
                        schedules,
                        isDuplicate,
                    };
                }) || [];

                allMedications.push(...meds);
            }

            setMedicationsToEdit(allMedications);
            setSymptom(detectedSymptom);
            setStep('edit');

        } catch (err: any) {
            setError(err.response?.data?.error || 'OCR 처리에 실패했습니다.');
            setStep('capture');
        } finally {
            setIsLoading(false);
        }
    };

    // 스케줄 토글
    const toggleSchedule = (medIndex: number, scheduleIndex: number) => {
        setMedicationsToEdit(prev => {
            const updated = [...prev];
            updated[medIndex].schedules[scheduleIndex].enabled =
                !updated[medIndex].schedules[scheduleIndex].enabled;
            return updated;
        });
    };

    // 스케줄 시간 변경
    const updateScheduleTime = (medIndex: number, scheduleIndex: number, newTime: string) => {
        setMedicationsToEdit(prev => {
            const updated = [...prev];
            updated[medIndex].schedules[scheduleIndex].scheduled_time = newTime;
            return updated;
        });
    };

    // 스케줄 추가
    const addSchedule = (medIndex: number, timeOfDay: string) => {
        const preset = Object.values(TIME_PRESETS).find(p => p.time_of_day === timeOfDay);
        if (!preset) return;

        setMedicationsToEdit(prev => {
            const updated = [...prev];
            const exists = updated[medIndex].schedules.some(s => s.time_of_day === timeOfDay);
            if (!exists) {
                updated[medIndex].schedules.push({
                    time_of_day: timeOfDay,
                    scheduled_time: preset.scheduled_time,
                    enabled: true,
                });
            }
            return updated;
        });
    };

    const handleConfirm = async () => {
        const newMedications = medicationsToEdit.filter(med =>
            !med.isDuplicate && med.schedules.some(s => s.enabled)
        );

        if (newMedications.length === 0) {
            alert('등록할 약이 없습니다. 복용 시간을 선택해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            let groupId: number | null = null;
            if (symptom) {
                const groupResponse = await api.medicationGroups.create({ name: symptom });
                groupId = groupResponse.data.id;
            }

            for (const med of newMedications) {
                const enabledSchedules = med.schedules
                    .filter(s => s.enabled)
                    .map(s => ({
                        time_of_day: s.time_of_day,
                        scheduled_time: s.scheduled_time,
                    }));

                await api.medications.create({
                    name: med.name,
                    dosage: med.dosage,
                    description: med.description,
                    schedules_input: enabledSchedules,
                    group_id: groupId,
                });
            }
            await fetchMedications();
            router.push('/medications');
        } catch (err: any) {
            setError('약 등록에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const getTimeLabel = (timeOfDay: string) => {
        const labels: { [key: string]: string } = {
            morning: '아침',
            noon: '점심',
            evening: '저녁',
            night: '취침 전',
        };
        return labels[timeOfDay] || timeOfDay;
    };

    const resetAll = () => {
        setStep('capture');
        setImages([]);
        setMedicationsToEdit([]);
        setSymptom('');
        setError('');
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
                            style={{ width: '44px', height: '44px', background: 'var(--color-cream)' }}
                        >
                            <ArrowLeft size={22} color="var(--color-text)" />
                        </Link>
                        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Camera size={24} color="var(--color-mint-dark)" />
                            처방전 스캔
                        </h1>
                        <div style={{ width: '44px' }} />
                    </header>

                    {error && (
                        <div style={{
                            padding: '1rem',
                            background: 'var(--color-pink-light)',
                            color: 'var(--color-danger)',
                            borderRadius: 'var(--border-radius)',
                            fontSize: 'var(--font-size-base)',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* STEP 1: 이미지 촬영/수집 */}
                    {step === 'capture' && (
                        <>
                            {/* 촬영된 이미지 목록 */}
                            {images.length > 0 && (
                                <div className="card">
                                    <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
                                        📸 촬영한 사진 ({images.length}장)
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {images.map((img, idx) => (
                                            <div key={idx} style={{ position: 'relative' }}>
                                                <img
                                                    src={img.preview}
                                                    alt={`처방전 ${idx + 1}`}
                                                    style={{
                                                        width: '80px',
                                                        height: '80px',
                                                        objectFit: 'cover',
                                                        borderRadius: '8px',
                                                    }}
                                                />
                                                <button
                                                    onClick={() => removeImage(idx)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-8px',
                                                        right: '-8px',
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        background: 'var(--color-danger)',
                                                        border: 'none',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 촬영 버튼 */}
                            <div
                                className="card"
                                style={{
                                    minHeight: images.length > 0 ? '150px' : '300px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    border: '3px dashed var(--color-cream-dark)',
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="status-icon" style={{
                                    width: '60px',
                                    height: '60px',
                                    background: 'var(--color-cream)',
                                    marginBottom: '0.75rem',
                                }}>
                                    {images.length > 0 ? (
                                        <Plus size={28} color="var(--color-text-light)" />
                                    ) : (
                                        <Camera size={28} color="var(--color-text-light)" />
                                    )}
                                </div>
                                <p style={{
                                    fontSize: 'var(--font-size-base)',
                                    color: 'var(--color-text-light)',
                                    textAlign: 'center',
                                }}>
                                    {images.length > 0
                                        ? '다른 봉지도 추가로 촬영하기'
                                        : '처방전 또는 약 봉투 촬영하기'
                                    }
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {/* 안내 */}
                            <div className="card" style={{ background: 'var(--color-mint-light)' }}>
                                <p style={{
                                    fontSize: 'var(--font-size-base)',
                                    color: 'var(--color-mint-dark)',
                                    fontWeight: 600,
                                    marginBottom: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <Lightbulb size={18} />
                                    스캔 팁
                                </p>
                                <ul style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-text)',
                                    paddingLeft: '1.5rem',
                                    margin: 0,
                                }}>
                                    <li>여러 봉지가 있으면 모두 촬영한 후 분석하세요</li>
                                    <li>밝은 곳에서 글씨가 잘 보이도록 촬영해주세요</li>
                                </ul>
                            </div>

                            {/* AI 분석 버튼 */}
                            <button
                                onClick={handleAnalyzeAll}
                                disabled={images.length === 0}
                                className="btn btn-primary w-full"
                                style={{ fontSize: 'var(--font-size-xl)', minHeight: '64px' }}
                            >
                                <Search size={24} />
                                {images.length > 1
                                    ? `${images.length}장 한번에 AI 분석하기`
                                    : 'AI로 분석하기'
                                }
                            </button>
                        </>
                    )}

                    {/* STEP 2: AI 분석 중 */}
                    {step === 'analyze' && (
                        <div className="card text-center" style={{ padding: '3rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <div className="status-icon" style={{
                                    width: '80px',
                                    height: '80px',
                                    background: 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint) 100%)',
                                }}>
                                    <Loader2 size={36} color="white" className="animate-spin" />
                                </div>
                            </div>
                            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: '0.5rem' }}>
                                AI 분석 중...
                            </p>
                            <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-light)' }}>
                                {images.length}장의 이미지를 분석하고 있습니다
                            </p>
                        </div>
                    )}

                    {/* STEP 3: 결과 편집 */}
                    {step === 'edit' && (
                        <>
                            {/* 증상/그룹 입력 */}
                            <div className="card" style={{ background: 'var(--color-mint-light)' }}>
                                <div className="flex items-center gap-4" style={{ marginBottom: '0.5rem' }}>
                                    <Package size={24} color="var(--color-mint-dark)" />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                            AI가 추정한 증상 (수정 가능)
                                        </p>
                                        <input
                                            type="text"
                                            value={symptom}
                                            onChange={(e) => setSymptom(e.target.value)}
                                            placeholder="증상/질환명 (예: 고혈압, 당뇨)"
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                fontSize: 'var(--font-size-lg)',
                                                fontWeight: 700,
                                                border: 'none',
                                                background: 'transparent',
                                                color: 'var(--color-mint-dark)',
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 약품 목록 */}
                            <div className="card">
                                <h2 style={{
                                    fontSize: 'var(--font-size-lg)',
                                    fontWeight: 700,
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <Clock size={20} color="var(--color-mint-dark)" />
                                    복용 시간 설정 ({medicationsToEdit.length}개 약품)
                                </h2>

                                {medicationsToEdit.map((med, medIndex) => (
                                    <div
                                        key={medIndex}
                                        style={{
                                            padding: '1rem',
                                            marginBottom: '1rem',
                                            background: med.isDuplicate ? 'var(--color-cream-dark)' : 'var(--color-cream)',
                                            borderRadius: 'var(--border-radius)',
                                            opacity: med.isDuplicate ? 0.7 : 1,
                                        }}
                                    >
                                        <div className="flex justify-between items-start" style={{ marginBottom: '0.75rem' }}>
                                            <div>
                                                <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                                                    {med.name}
                                                </p>
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                                    {med.dosage}
                                                </p>
                                            </div>
                                            {med.isDuplicate && (
                                                <span style={{
                                                    fontSize: 'var(--font-size-sm)',
                                                    color: 'white',
                                                    background: 'var(--color-danger)',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '999px',
                                                    fontWeight: 600,
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    이미 등록됨
                                                </span>
                                            )}
                                        </div>

                                        {!med.isDuplicate && (
                                            <>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                    {['morning', 'noon', 'evening', 'night'].map(timeOfDay => {
                                                        const schedule = med.schedules.find(s => s.time_of_day === timeOfDay);
                                                        const isActive = schedule?.enabled;

                                                        return (
                                                            <button
                                                                key={timeOfDay}
                                                                onClick={() => {
                                                                    if (schedule) {
                                                                        toggleSchedule(medIndex, med.schedules.indexOf(schedule));
                                                                    } else {
                                                                        addSchedule(medIndex, timeOfDay);
                                                                    }
                                                                }}
                                                                style={{
                                                                    padding: '0.5rem 1rem',
                                                                    borderRadius: 'var(--border-radius-pill)',
                                                                    border: 'none',
                                                                    background: isActive ? 'var(--color-mint)' : 'white',
                                                                    color: isActive ? 'white' : 'var(--color-text)',
                                                                    fontWeight: 600,
                                                                    fontSize: 'var(--font-size-sm)',
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                {getTimeLabel(timeOfDay)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {med.schedules.filter(s => s.enabled).map((schedule, schedIdx) => (
                                                    <div
                                                        key={schedIdx}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            marginTop: '0.5rem',
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)', minWidth: '60px' }}>
                                                            {getTimeLabel(schedule.time_of_day)}
                                                        </span>
                                                        <input
                                                            type="time"
                                                            value={schedule.scheduled_time}
                                                            onChange={(e) => {
                                                                const originalIndex = med.schedules.indexOf(schedule);
                                                                updateScheduleTime(medIndex, originalIndex, e.target.value);
                                                            }}
                                                            style={{
                                                                padding: '0.5rem',
                                                                borderRadius: 'var(--border-radius)',
                                                                border: '1px solid var(--color-cream-dark)',
                                                                fontSize: 'var(--font-size-base)',
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* 버튼 */}
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleConfirm}
                                    disabled={isLoading}
                                    className="btn btn-primary w-full"
                                    style={{ fontSize: 'var(--font-size-xl)', minHeight: '64px' }}
                                >
                                    {isLoading ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Check size={24} />
                                            {symptom ? `"${symptom}" 그룹으로 등록` : '등록 완료'}
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={resetAll}
                                    className="btn w-full"
                                    style={{ background: 'var(--color-cream)', color: 'var(--color-text)' }}
                                >
                                    <RefreshCw size={20} />
                                    처음부터 다시
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
