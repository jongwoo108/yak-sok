'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Pill, Clock, Calendar, Save, Edit2, X, Trash2 } from 'lucide-react';
import { useMedicationStore } from '@/services/store';

export default function MedicationDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { medications, updateMedication, deleteMedication, isLoading } = useMedicationStore();
    const [isEditing, setIsEditing] = useState(false);

    // ID로 약 정보 찾기
    const medication = medications.find(m => m.id === Number(params.id));

    // 폼 설정
    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
            dosage: '',
            description: '',
        }
    });

    // 데이터 로드 시 폼 초기화
    useEffect(() => {
        if (medication) {
            reset({
                name: medication.name,
                dosage: medication.dosage || '',
                description: medication.description || '',
            });
        }
    }, [medication, reset]);

    const onSubmit = async (data: any) => {
        if (!medication) return;
        try {
            await updateMedication(medication.id, data);
            setIsEditing(false);
            alert('수정되었습니다.');
        } catch (error) {
            alert('수정에 실패했습니다.');
        }
    };

    const handleDelete = async () => {
        if (!medication) return;
        if (confirm(`'${medication.name}' 약을 정말 삭제하시겠습니까?`)) {
            try {
                await deleteMedication(medication.id);
                router.replace('/medications');
            } catch (error) {
                alert('삭제에 실패했습니다.');
            }
        }
    };

    if (!medication) {
        return (
            <div className="page-wrapper items-center justify-center">
                <p>약을 찾을 수 없습니다.</p>
                <Link href="/medications" className="btn btn-primary mt-4">목록으로</Link>
            </div>
        );
    }

    return (
        <>
            <div className="organic-bg" />
            <div className="page-wrapper">
                <div className="page-content">
                    {/* 헤더 */}
                    <header className="flex items-center justify-between">
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
                        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                            {isEditing ? '약 정보 수정' : '약 상세 정보'}
                        </h1>
                        <div style={{ width: '44px' }} />
                    </header>

                    {/* 카드 형태의 메인 콘텐츠 */}
                    <div className="card">
                        {isEditing ? (
                            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-bold text-gray-700">약 이름</label>
                                    <input
                                        {...register('name', { required: '약 이름을 입력해주세요' })}
                                        className="input"
                                        placeholder="예: 아스피린"
                                    />
                                    {errors.name && <p className="text-danger text-sm mt-1">{errors.name.message as string}</p>}
                                </div>

                                <div>
                                    <label className="block mb-2 text-sm font-bold text-gray-700">용량/복용량</label>
                                    <input
                                        {...register('dosage')}
                                        className="input"
                                        placeholder="예: 500mg, 1정"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 text-sm font-bold text-gray-700">설명 / 주의사항</label>
                                    <textarea
                                        {...register('description')}
                                        className="input"
                                        rows={4}
                                        placeholder="식후 30분, 졸음 주의 등"
                                        style={{ height: 'auto' }}
                                    />
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn w-full">
                                        취소
                                    </button>
                                    <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                                        {isLoading ? '저장 중...' : '저장하기'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {/* 상단 정보 */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: '0.5rem' }}>
                                            {medication.name}
                                        </h2>
                                        {medication.dosage && (
                                            <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-light)' }}>
                                                {medication.dosage}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '9999px',
                                        background: medication.is_active
                                            ? 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint) 100%)'
                                            : 'var(--color-pink-light)',
                                        color: medication.is_active ? 'white' : 'var(--color-danger)',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        alignSelf: 'flex-start',
                                        height: 'fit-content',
                                    }}>
                                        {medication.is_active ? '복용 중' : '중단'}
                                    </div>
                                </div>

                                {/* 설명 */}
                                {medication.description && (
                                    <div style={{ padding: '1rem', background: 'var(--color-cream-light)', borderRadius: 'var(--border-radius)', fontSize: 'var(--font-size-base)' }}>
                                        {medication.description}
                                    </div>
                                )}

                                {/* 복용 시간 정보 */}
                                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-cream-dark)' }}>
                                    <h3 className="flex items-center gap-2 mb-4" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                                        <Clock size={20} />
                                        복용 시간
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {medication.schedules?.map((schedule: any) => (
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

                                {/* 액션 버튼들 */}
                                <div className="flex gap-4 mt-4">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="btn w-full"
                                        style={{ background: 'var(--color-blue-light)', color: 'white' }}
                                    >
                                        <Edit2 size={20} />
                                        정보 수정
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="btn w-full"
                                        style={{ background: 'var(--color-pink-light)', color: 'var(--color-danger)' }}
                                    >
                                        <Trash2 size={20} />
                                        약 삭제
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
