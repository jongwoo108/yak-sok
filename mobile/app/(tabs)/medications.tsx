/**
 * MedicationsScreen - 뉴모피즘 + 파스텔 약 목록 화면
 * Neumorphism + Pastel Design
 */

import { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useMedicationStore } from '../../services/store';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard, NeumorphIconButton } from '../../components';


export default function MedicationsScreen() {
    const router = useRouter();
    const { medications, fetchMedications, deleteMedication, deleteMedicationGroup, isLoading } = useMedicationStore();
    const [refreshing, setRefreshing] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetchMedications();
    }, []);

    // Edit Mode Toggle: Clear selection when exiting
    useEffect(() => {
        if (!isEditMode) {
            setSelectedIds(new Set());
        }
    }, [isEditMode]);

    const toggleSelection = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === medications.length) {
            setSelectedIds(new Set()); // Deselect All
        } else {
            const allIds = new Set(medications.map(m => m.id));
            setSelectedIds(allIds);
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;

        Alert.alert(
            '선택 삭제',
            `선택한 ${selectedIds.size}개의 약을 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        // Batch delete logic (Client-side loop since backend batch endpoint might not exist yet)
                        for (const id of selectedIds) {
                            await deleteMedication(id);
                        }
                        setIsEditMode(false);
                    }
                }
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMedications();
        setRefreshing(false);
    };

    const handleDelete = (id: number, name: string) => {
        Alert.alert(
            '약 삭제',
            `'${name}'을(를) 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteMedication(id);
                    }
                }
            ]
        );
    };

    const handleDeleteGroup = (groupId: number, groupName: string) => {
        Alert.alert(
            '그룹 삭제',
            `'${groupName}' 그룹과 포함된 약을 모두 삭제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '그룹 삭제',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteMedicationGroup(groupId);
                    }
                }
            ]
        );
    };

    // ... (groupedMedications logic unchanged) ...
    const groupedMedications = medications.reduce((acc, med) => {
        const groupName = med.group_name || '기타';
        if (!acc[groupName]) {
            acc[groupName] = [];
        }
        acc[groupName].push(med);
        return acc;
    }, {} as Record<string, typeof medications>);

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* 중앙 헤더 (buttons moved to absolute view) */}
                <View style={styles.header}>
                    <NeumorphIconButton style={styles.headerIconBtn}>
                        <Ionicons name="medical" size={32} color={colors.primary} />
                    </NeumorphIconButton>
                    <Text style={styles.headerTitle}>내 약 목록</Text>
                </View>

                {/* 약 목록 */}
                {isLoading && !refreshing ? (
                    <NeumorphCard style={styles.loadingCard}>
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.loadingText}>로딩 중...</Text>
                        </View>
                    </NeumorphCard>
                ) : medications.length === 0 ? (
                    <NeumorphCard style={styles.emptyCard}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="document-text-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.emptyText}>등록된 약이 없습니다</Text>
                        <Text style={styles.emptySubtext}>
                            아래 버튼을 눌러 약을 추가해보세요
                        </Text>
                    </NeumorphCard>
                ) : (
                    Object.entries(groupedMedications).map(([groupName, meds]) => (
                        <View key={groupName} style={styles.groupSection}>
                            {/* 그룹 헤더 */}
                            <View style={styles.groupHeader}>
                                <View style={styles.groupTitleRow}>
                                    <View style={styles.groupIconCircle}>
                                        <Feather name="folder" size={14} color={colors.primary} />
                                    </View>
                                    <Text style={styles.groupName}>{groupName}</Text>
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countBadgeText}>{meds.length}</Text>
                                    </View>
                                </View>

                                {/* Group Delete Button (Edit Mode) */}
                                {isEditMode && meds[0]?.group_id && (
                                    <TouchableOpacity
                                        style={styles.groupDeleteButton}
                                        onPress={() => handleDeleteGroup(meds[0].group_id!, groupName)}
                                    >
                                        <Text style={styles.groupDeleteText}>그룹 삭제</Text>
                                        <Ionicons name="trash-outline" size={14} color={colors.dangerDark} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* 약품 카드들 */}
                            {meds.map((med) => (
                                <View key={med.id} style={{ position: 'relative' }}>
                                    <NeumorphCard style={styles.medicationCard}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.medicationName}>{med.name}</Text>
                                            <View style={[
                                                styles.statusBadge,
                                                med.is_active ? styles.statusActive : styles.statusInactive
                                            ]}>
                                                <Text style={[
                                                    styles.statusText,
                                                    med.is_active ? styles.statusTextActive : styles.statusTextInactive
                                                ]}>
                                                    {med.is_active ? '복용 중' : '중단'}
                                                </Text>
                                            </View>
                                        </View>

                                        {med.dosage && (
                                            <Text style={styles.dosage}>{med.dosage}</Text>
                                        )}

                                        {/* 복용 시간 태그 */}
                                        {med.schedules && med.schedules.length > 0 && (
                                            <View style={styles.scheduleRow}>
                                                {med.schedules.map((schedule) => (
                                                    <View key={schedule.id} style={styles.scheduleTag}>
                                                        <Ionicons name="time-outline" size={12} color={colors.primary} />
                                                        <Text style={styles.scheduleTagText}>
                                                            {schedule.time_of_day_display} {schedule.scheduled_time?.slice(0, 5)}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </NeumorphCard>

                                    {/* Selection Overlay for Edit Mode */}
                                    {isEditMode && (
                                        <TouchableOpacity
                                            style={styles.selectionOverlay}
                                            activeOpacity={1}
                                            onPress={() => toggleSelection(med.id)}
                                        >
                                            <View style={[
                                                styles.checkbox,
                                                selectedIds.has(med.id) && styles.checkboxSelected
                                            ]}>
                                                {selectedIds.has(med.id) && (
                                                    <Ionicons name="checkmark" size={16} color="white" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    ))
                )}

                {/* 하단 여백 */}
                <View style={{ height: 140 }} />
            </ScrollView>

            {/* 상단 컨트롤 버튼 (Absolute Position) */}
            <View style={styles.absoluteTopBar} pointerEvents="box-none">
                {isEditMode ? (
                    <TouchableOpacity
                        style={styles.selectAllButton}
                        onPress={handleSelectAll}
                    >
                        <Text style={styles.selectAllText}>
                            {selectedIds.size === medications.length ? '선택 해제' : '전체 선택'}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <View style={styles.backButtonInner}>
                            <Ionicons name="chevron-back" size={22} color={colors.text} />
                        </View>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.editButton, isEditMode && styles.editButtonActive]}
                    onPress={() => setIsEditMode(!isEditMode)}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.editButtonText, isEditMode && styles.editButtonTextActive]}>
                        {isEditMode ? '완료' : '편집'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 약 추가 FAB 버튼들 */}
            {/* 약 추가 FAB 버튼들 (NeumorphFab is removed, using inline style for now or replace with ClayCard variant if needed, but let's keep inline structure simplified for brevity or use NeumorphCard logic) -> Actually I removed NeumorphFab definition. I should provide a quick inline replacement or restore it.
            Wait, I removed NeumorphFab but didn't provide a shared replacement. I should probably re-implement it as a shared component or just use a standard View style here. 
            Re-implementing inline here to avoid breaking changes, but better structure.
            */}
            <View style={styles.fabRow}>
                {isEditMode ? (
                    <TouchableOpacity
                        onPress={handleDeleteSelected}
                        style={{ flex: 1 }}
                        activeOpacity={0.8}
                        disabled={selectedIds.size === 0}
                    >
                        <View style={styles.fabContainer}>
                            <View style={[styles.fabShadow, { shadowColor: selectedIds.size > 0 ? '#FF5252' : colors.textLight }]} />
                            <View style={[styles.fabSurface, { backgroundColor: selectedIds.size > 0 ? '#FF5252' : colors.textLight }]}>
                                <Ionicons name="trash" size={20} color={colors.white} />
                                <Text style={styles.fabText}>
                                    {selectedIds.size > 0 ? `${selectedIds.size}개 삭제하기` : '삭제할 항목 선택'}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity onPress={() => router.push('/medications/scan' as any)} style={{ flex: 1 }} activeOpacity={0.8}>
                            <View style={styles.fabContainer}>
                                <View style={styles.fabShadow} />
                                <View style={styles.fabShadowLight} />
                                <View style={[styles.fabSurface, { backgroundColor: colors.base }]}>
                                    <Ionicons name="camera" size={20} color={colors.primary} />
                                    <Text style={[styles.fabText, { color: colors.primary }]}>처방전 스캔</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => router.push('/medications/add')} style={{ flex: 1 }} activeOpacity={0.8}>
                            <View style={styles.fabContainer}>
                                <View style={[styles.fabShadow, { shadowColor: colors.primary }]} />
                                <View style={styles.fabShadowLight} />
                                <View style={[styles.fabSurface, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="add" size={20} color={colors.white} />
                                    <Text style={styles.fabText}>직접 추가</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    // ... existing styles ...
    container: {
        flex: 1,
        backgroundColor: colors.base,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    // 상단 절대 위치 바
    absoluteTopBar: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 50,
        left: spacing.xl,
        right: spacing.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    headerIconBtn: {
        marginBottom: spacing.lg,
    },
    // ... (rest of styles, need to ensure I don't break them)
    backButton: {
        position: 'relative',
    },
    backButtonInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.soft,
    },
    headerTitle: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    editButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.pill,
        backgroundColor: colors.base,
        ...shadows.soft,
    },
    editButtonActive: {
        backgroundColor: colors.primary,
    },
    editButtonText: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: fontWeight.semibold,
    },
    editButtonTextActive: {
        color: 'white',
    },


    // 로딩
    loadingCard: {
        paddingVertical: spacing.xxxl,
    },
    loadingContainer: {
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: fontSize.base,
        color: colors.textSecondary,
    },

    // 빈 상태
    emptyCard: {
        alignItems: 'center',
        paddingVertical: spacing.xxxxl,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.mintLight,  // 민트 테마와 통일
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyEmoji: {
        fontSize: 36,
    },
    emptyText: {
        fontSize: fontSize.lg,
        color: colors.text,
        fontWeight: fontWeight.semibold,
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        fontSize: fontSize.sm,
        color: colors.textLight,
    },

    // 그룹 섹션
    groupSection: {
        marginBottom: spacing.xl,
    },
    groupHeader: {
        marginBottom: spacing.md,
    },
    groupTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.mintLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    groupName: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
        flex: 1,
    },
    countBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.mintLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countBadgeText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },

    // 약품 카드
    medicationCard: {
        marginBottom: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    medicationName: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.pill,
    },
    statusActive: {
        backgroundColor: colors.mintLight,
    },
    statusInactive: {
        backgroundColor: colors.peachLight,
    },
    statusText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
    },
    statusTextActive: {
        color: colors.primaryDark,
    },
    statusTextInactive: {
        color: colors.peachDark,
    },
    dosage: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },

    // 스케줄 태그
    scheduleRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    scheduleTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.blueLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.pill,
        gap: spacing.xs,
    },
    scheduleTagText: {
        fontSize: fontSize.xs,
        color: colors.blueDark,
        fontWeight: fontWeight.medium,
    },

    // 삭제 버튼 배지
    deleteButtonBadge: {
        position: 'absolute',
        top: -8,
        right: -4,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FF5252',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        elevation: 6,
        shadowColor: '#FF5252',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },

    // FAB 버튼
    fabRow: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 90,
        left: spacing.xl,
        right: spacing.xl,
        flexDirection: 'row',
        gap: spacing.md,
    },
    fabContainer: {
        position: 'relative',
        borderRadius: borderRadius.pill,
        overflow: 'visible',
    },

    // 선택 모드 UI
    selectionOverlay: {
        position: 'absolute',
        top: -8,
        right: -4,
        zIndex: 10,
    },
    // 그룹 삭제 버튼
    groupDeleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.danger + '20', // Opacity 20%
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: borderRadius.md,
        gap: 4,
    },
    groupDeleteText: {
        fontSize: fontSize.xs,
        color: colors.dangerDark,
        fontWeight: fontWeight.bold,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.textLight,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.soft,
    },
    checkboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    selectAllButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    selectAllText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },
    fabShadow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        borderRadius: borderRadius.pill,
        shadowColor: '#B8C4CE',
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 8,
    },
    fabShadowLight: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        borderRadius: borderRadius.pill,
        shadowColor: '#FFFFFF',
        shadowOffset: { width: -4, height: -4 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 0,
    },
    fabSurface: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.pill,
        gap: spacing.sm,
    },
    fabText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
});
