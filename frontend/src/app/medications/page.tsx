'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pill, Plus, Camera, Clock, Loader2, Check, Trash2, Package } from 'lucide-react';
import { useMedicationStore } from '@/services/store';
import { motion, AnimatePresence } from 'framer-motion';

// 그룹별 색상 팔레트
const GROUP_COLORS = [
    { bg: 'rgba(157, 192, 139, 0.15)', border: 'var(--color-mint)', tag: 'var(--color-mint-dark)' },
    { bg: 'rgba(255, 182, 193, 0.15)', border: '#f8a5b8', tag: '#d66a7e' },
    { bg: 'rgba(173, 216, 230, 0.15)', border: '#87CEEB', tag: '#4682B4' },
    { bg: 'rgba(255, 218, 185, 0.15)', border: '#FFB347', tag: '#CC7722' },
    { bg: 'rgba(221, 160, 221, 0.15)', border: '#DDA0DD', tag: '#8B4789' },
];

interface GroupedMedications {
    group_id: number | null;
    group_name: string | null;
    medications: any[];
    colorIndex: number;
}

export default function MedicationsPage() {
    const router = useRouter();
    const { medications, fetchMedications, deleteMedication, isLoading } = useMedicationStore();
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        fetchMedications();
    }, [fetchMedications]);

    // 약품을 그룹별로 묶기
    const groupedMedications: GroupedMedications[] = [];
    const groupMap = new Map<number | null, GroupedMedications>();
    let colorIndex = 0;

    medications.forEach((med: any) => {
        const key = med.group?.id || null;

        if (!groupMap.has(key)) {
            groupMap.set(key, {
                group_id: key,
                group_name: med.group?.name || null,
                medications: [],
                colorIndex: key !== null ? colorIndex++ : -1,
            });
        }
        groupMap.get(key)!.medications.push(med);
    });

    groupMap.forEach(group => groupedMedications.push(group));
    // 그룹 있는 것 먼저, 없는 것 나중에
    groupedMedications.sort((a, b) => {
        if (a.group_id && !b.group_id) return -1;
        if (!a.group_id && b.group_id) return 1;
        return 0;
    });

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIds([]);
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(itemId => itemId !== id)
                : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === medications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(medications.map((m: any) => m.id));
        }
    };

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

    const handleCardClick = (medication: any) => {
        if (isSelectionMode) {
            toggleSelect(medication.id);
        } else {
            router.push(`/medications/${medication.id}`);
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
                            style={{ width: '44px', height: '44px', background: 'var(--color-cream)' }}
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
                                border: 'none',
                            }}
                        >
                            {isSelectionMode ? '완료' : '편집'}
                        </button>
                    </header>

                    {/* 약 목록 - 그룹별 표시 */}
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
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <div className="status-icon" style={{ width: '80px', height: '80px', background: 'var(--color-cream)' }}>
                                        <Pill size={36} color="var(--color-text-light)" />
                                    </div>
                                </div>
                                <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: '1rem' }}>등록된 약이 없습니다.</p>
                                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-light)' }}>
                                    아래 버튼을 눌러 약을 추가해보세요.
                                </p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {groupedMedications.map((group) => {
                                    const colors = group.colorIndex >= 0
                                        ? GROUP_COLORS[group.colorIndex % GROUP_COLORS.length]
                                        : null;

                                    return (
                                        <motion.div
                                            key={group.group_id || 'ungrouped'}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            style={{
                                                background: colors ? colors.bg : 'transparent',
                                                borderLeft: colors ? `4px solid ${colors.border}` : 'none',
                                                borderRadius: colors ? 'var(--border-radius)' : '0',
                                                padding: colors ? '1rem' : '0',
                                                marginBottom: colors ? '0' : '0',
                                            }}
                                        >
                                            {/* 그룹 헤더 */}
                                            {group.group_name && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    marginBottom: '0.75rem',
                                                    paddingBottom: '0.5rem',
                                                    borderBottom: `1px dashed ${colors?.border || 'var(--color-cream-dark)'}`,
                                                }}>
                                                    <Package size={18} color={colors?.tag || 'var(--color-text-light)'} />
                                                    <span style={{
                                                        fontSize: 'var(--font-size-base)',
                                                        fontWeight: 700,
                                                        color: colors?.tag || 'var(--color-text)',
                                                    }}>
                                                        {group.group_name}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 'var(--font-size-sm)',
                                                        color: 'var(--color-text-light)',
                                                    }}>
                                                        ({group.medications.length}개)
                                                    </span>
                                                </div>
                                            )}

                                            {/* 그룹 내 약품 카드들 */}
                                            {group.medications.map((medication) => (
                                                <motion.div
                                                    key={medication.id}
                                                    layout
                                                    onClick={() => handleCardClick(medication)}
                                                    className="card"
                                                    style={{
                                                        position: 'relative',
                                                        marginBottom: '0.75rem',
                                                        cursor: 'pointer',
                                                        border: selectedIds.includes(medication.id)
                                                            ? '2px solid var(--color-mint)'
                                                            : '2px solid transparent',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {/* 선택 체크박스 */}
                                                    {isSelectionMode && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '1rem',
                                                            right: '1rem',
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            border: selectedIds.includes(medication.id) ? 'none' : '2px solid var(--color-text-light)',
                                                            background: selectedIds.includes(medication.id) ? 'var(--color-mint)' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            zIndex: 10,
                                                        }}>
                                                            {selectedIds.includes(medication.id) && <Check size={16} color="white" />}
                                                        </div>
                                                    )}

                                                    {/* 상태 바 */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: '4px',
                                                        background: medication.is_active
                                                            ? `linear-gradient(90deg, ${colors?.border || 'var(--color-mint)'} 0%, ${colors?.tag || 'var(--color-mint-dark)'} 100%)`
                                                            : 'linear-gradient(90deg, var(--color-pink-light) 0%, var(--color-pink) 100%)',
                                                    }} />

                                                    <div className="flex items-start" style={{ justifyContent: 'space-between', paddingRight: isSelectionMode ? '2rem' : '0', gap: '1rem' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div className="flex items-center gap-2" style={{ flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                                                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                                                                    {medication.name}
                                                                </h2>
                                                                {/* 증상 태그 (그룹 없는 약에도 표시) */}
                                                                {medication.group?.name && !group.group_name && (
                                                                    <span style={{
                                                                        fontSize: 'var(--font-size-xs)',
                                                                        padding: '0.125rem 0.5rem',
                                                                        borderRadius: '999px',
                                                                        background: colors?.bg || 'var(--color-cream)',
                                                                        color: colors?.tag || 'var(--color-text-light)',
                                                                        fontWeight: 600,
                                                                    }}>
                                                                        {medication.group.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {medication.dosage && (
                                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                                                    {medication.dosage}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {!isSelectionMode && (
                                                            <div style={{
                                                                padding: '0.5rem 1rem',
                                                                borderRadius: '9999px',
                                                                background: medication.is_active
                                                                    ? `linear-gradient(135deg, var(--color-mint-light) 0%, var(--color-mint) 100%)`
                                                                    : 'var(--color-pink-light)',
                                                                color: medication.is_active ? 'white' : 'var(--color-danger)',
                                                                fontSize: 'var(--font-size-sm)',
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap',
                                                                flexShrink: 0,
                                                                alignSelf: 'flex-start',
                                                                minWidth: 'fit-content',
                                                            }}>
                                                                {medication.is_active ? '복용 중' : '중단'}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 복용 시간 */}
                                                    {medication.schedules && medication.schedules.length > 0 && (
                                                        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                            {medication.schedules.map((schedule: any) => (
                                                                <span
                                                                    key={schedule.id}
                                                                    style={{
                                                                        padding: '0.25rem 0.75rem',
                                                                        background: 'var(--color-cream)',
                                                                        color: 'var(--color-text)',
                                                                        borderRadius: 'var(--border-radius-pill)',
                                                                        fontSize: 'var(--font-size-sm)',
                                                                        fontWeight: 500,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.25rem',
                                                                    }}
                                                                >
                                                                    <Clock size={12} />
                                                                    {schedule.time_of_day_display} {schedule.scheduled_time.slice(0, 5)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                    </section>

                    {/* 약 추가 버튼 */}
                    {!isSelectionMode && (
                        <div className="flex flex-col gap-4 mt-4">
                            <Link href="/medications/add" className="btn btn-primary w-full">
                                <Plus size={20} />
                                직접 약 추가하기
                            </Link>
                            <Link href="/medications/scan" className="btn w-full" style={{ background: 'var(--color-cream)', color: 'var(--color-text)' }}>
                                <Camera size={20} />
                                처방전 스캔으로 추가
                            </Link>
                        </div>
                    )}

                    {/* 선택 삭제 하단 바 */}
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
                            <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1.5rem', display: 'flex', gap: '1rem' }}>
                                <button onClick={toggleSelectAll} className="btn flex-1" style={{ background: 'var(--color-cream)' }}>
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
