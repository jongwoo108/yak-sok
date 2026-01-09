'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pill, Plus, Camera, Clock, Loader2, Check, Trash2, X } from 'lucide-react';
import { useMedicationStore } from '@/services/store';
import { motion, AnimatePresence } from 'framer-motion';

// 개별 약품 카드 컴포넌트 (Swipe 제거, 선택 모드 추가)
function MedicationCard({
    medication,
    isSelectionMode,
    isSelected,
    onToggleSelect
}: {
    medication: any,
    isSelectionMode: boolean,
    isSelected: boolean,
    onToggleSelect: (id: number) => void
}) {
    const router = useRouter();

    const handleCardClick = () => {
        if (isSelectionMode) {
            onToggleSelect(medication.id);
        } else {
            router.push(`/medications/${medication.id}`);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={handleCardClick}
            className="card"
            style={{
                position: 'relative',
                marginBottom: '1rem',
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--color-mint)' : '2px solid transparent',
                transition: 'border-color 0.2s',
                overflow: 'hidden',
            }}
        >
            {/* 선택 체크박스 (관리 모드일 때만 표시) */}
            {isSelectionMode && (
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: isSelected ? 'none' : '2px solid var(--color-text-light)',
                    background: isSelected ? 'var(--color-mint)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}>
                    {isSelected && <Check size={16} color="white" />}
                </div>
            )}

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
                }}
            />

            <div className="flex items-start" style={{ justifyContent: 'space-between', paddingRight: isSelectionMode ? '2rem' : '0.5rem' }}>
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
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {medication.description}
                        </p>
                    )}
                </div>
                {!isSelectionMode && (
                    <div style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        background: medication.is_active
                            ? 'linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint) 100%)'
                            : 'var(--color-pink-light)',
                        color: medication.is_active ? 'white' : 'var(--color-danger)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 600,
                        marginTop: '0.25rem',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        alignSelf: 'flex-start',
                        height: 'fit-content',
                    }}>
                        {medication.is_active ? '복용 중' : '중단'}
                    </div>
                )}
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
                        {medication.schedules.map((schedule: any) => (
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
        </motion.div>
    );
}

export default function MedicationsPage() {
    const { medications, fetchMedications, deleteMedication, isLoading } = useMedicationStore();
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        fetchMedications();
    }, [fetchMedications]);

    // 선택 모드 토글
    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIds([]); // 모드 변경 시 선택 초기화
    };

    // 개별 선택 토글
    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(itemId => itemId !== id)
                : [...prev, id]
        );
    };

    // 전체 선택 / 해제
    const toggleSelectAll = () => {
        if (selectedIds.length === medications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(medications.map(m => m.id));
        }
    };

    // 선택 삭제
    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        if (confirm(`선택한 ${selectedIds.length}개의 약을 삭제하시겠습니까?`)) {
            for (const id of selectedIds) {
                await deleteMedication(id);
            }
            setIsSelectionMode(false);
            setSelectedIds([]);
        }
    };

    return (
        <>
            <div className="organic-bg" />
            <div className="page-wrapper">
                <div className="page-content" style={{ paddingBottom: isSelectionMode ? '80px' : '20px' }}>
                    {/* 헤더 */}
                    <header className="flex items-center justify-between">
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
                        <button
                            onClick={toggleSelectionMode}
                            className="status-icon"
                            style={{
                                width: 'fit-content',
                                height: '44px',
                                padding: '0 1rem',
                                background: isSelectionMode ? 'var(--color-mint)' : 'var(--color-cream)',
                                color: isSelectionMode ? 'white' : 'var(--color-text)',
                                fontSize: 'var(--font-size-base)',
                                fontWeight: 600,
                                borderRadius: 'var(--border-radius-pill)',
                            }}
                        >
                            {isSelectionMode ? '완료' : '편집'}
                        </button>
                    </header>

                    {/* 약 목록 */}
                    <section className="flex flex-col gap-4 mt-6">
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
                            <AnimatePresence>
                                {medications.map((medication) => (
                                    <MedicationCard
                                        key={medication.id}
                                        medication={medication}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedIds.includes(medication.id)}
                                        onToggleSelect={toggleSelect}
                                    />
                                ))}
                            </AnimatePresence>
                        )}
                    </section>

                    {/* 약 추가 버튼 (편집 모드가 아닐 때만 표시) */}
                    {!isSelectionMode && (
                        <div className="flex flex-col gap-4 mt-4">
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
                    )}

                    {/* 선택 삭제 하단 바 (편집 모드일 때만 표시) */}
                    {isSelectionMode && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            style={{
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'white',
                                boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                                zIndex: 100,
                            }}
                        >
                            <div style={{
                                maxWidth: '480px',
                                margin: '0 auto',
                                padding: '1.5rem',
                                display: 'flex',
                                gap: '1rem',
                            }}>
                                <button
                                    onClick={toggleSelectAll}
                                    className="btn flex-1"
                                    style={{ background: 'var(--color-cream)' }}
                                >
                                    {selectedIds.length === medications.length ? '전체 해제' : '전체 선택'}
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    disabled={selectedIds.length === 0}
                                    className="btn flex-1"
                                    style={{
                                        background: selectedIds.length > 0 ? 'var(--color-danger)' : 'var(--color-text-light)',
                                        color: 'white',
                                        opacity: selectedIds.length > 0 ? 1 : 0.5,
                                    }}
                                >
                                    <Trash2 size={20} />
                                    {selectedIds.length}개 삭제
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </>
    );
}
