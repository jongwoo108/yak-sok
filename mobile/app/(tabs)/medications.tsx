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

// 뉴모피즘 카드 컴포넌트
const NeumorphCard = ({ children, style, variant = 'default' }: {
    children: React.ReactNode;
    style?: any;
    variant?: 'default' | 'inset';
}) => {
    // style 배열에서 alignItems, justifyContent 등의 스타일을 분리
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : (style || {});
    const { alignItems, justifyContent, paddingVertical, ...containerStyle } = flatStyle;
    const surfaceStyle = { alignItems, justifyContent, paddingVertical };

    if (variant === 'inset') {
        return (
            <View style={[styles.insetCard, style]}>
                {children}
            </View>
        );
    }

    return (
        <View style={[styles.neumorphContainer, containerStyle]}>
            <View style={[styles.shadowDark, { borderRadius: borderRadius.xl }]} />
            <View style={[styles.shadowLight, { borderRadius: borderRadius.xl }]} />
            <View style={[styles.cardSurface, surfaceStyle]}>
                {children}
            </View>
        </View>
    );
};

// 뉴모피즘 FAB 버튼
const NeumorphFab = ({
    children,
    onPress,
    style,
    color = colors.primary
}: {
    children: React.ReactNode;
    onPress: () => void;
    style?: any;
    color?: string;
}) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
        <View style={[styles.fabContainer]}>
            <View style={[styles.fabShadow, { shadowColor: color }]} />
            <View style={[styles.fabSurface, { backgroundColor: color }]}>
                {children}
            </View>
        </View>
    </TouchableOpacity>
);

export default function MedicationsScreen() {
    const router = useRouter();
    const { medications, fetchMedications, deleteMedication, isLoading } = useMedicationStore();
    const [refreshing, setRefreshing] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        fetchMedications();
    }, []);

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
                {/* 헤더 */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <View style={styles.backButtonInner}>
                            <Ionicons name="chevron-back" size={22} color={colors.text} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.headerTitleRow}>
                        <Ionicons name="medical" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.headerTitle}>내 약 목록</Text>
                    </View>

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
                                        <Feather name="folder" size={14} color={colors.lavenderDark} />
                                    </View>
                                    <Text style={styles.groupName}>{groupName}</Text>
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countBadgeText}>{meds.length}</Text>
                                    </View>
                                </View>
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

                                    {/* 삭제 버튼 (편집 모드일 때만 표시) */}
                                    {isEditMode && (
                                        <TouchableOpacity
                                            style={styles.deleteButtonBadge}
                                            onPress={() => handleDelete(med.id, med.name)}
                                        >
                                            <Ionicons name="remove" size={16} color="white" />
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

            {/* 약 추가 FAB 버튼들 */}
            <View style={styles.fabRow}>
                <NeumorphFab
                    onPress={() => router.push('/medications/scan' as any)}
                    style={{ flex: 1 }}
                    color={colors.base}
                >
                    <Ionicons name="camera" size={20} color={colors.primary} />
                    <Text style={[styles.fabText, { color: colors.primary }]}>처방전 스캔</Text>
                </NeumorphFab>

                <NeumorphFab
                    onPress={() => router.push('/medications/add')}
                    style={{ flex: 1 }}
                    color={colors.primary}
                >
                    <Ionicons name="add" size={20} color={colors.white} />
                    <Text style={styles.fabText}>직접 추가</Text>
                </NeumorphFab>
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

    // 헤더 (스타일 업데이트 필요할 수 있음)
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xxl,
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
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    headerTitle: {
        fontSize: fontSize.xl,
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

    // 뉴모피즘 카드
    neumorphContainer: {
        position: 'relative',
        marginBottom: spacing.md,
    },
    shadowDark: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        ...shadows.dark,
    },
    shadowLight: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        ...shadows.light,
    },
    cardSurface: {
        backgroundColor: colors.base,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    insetCard: {
        backgroundColor: colors.base,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 2,
        borderTopColor: 'rgba(184, 196, 206, 0.4)',
        borderLeftColor: 'rgba(184, 196, 206, 0.4)',
        borderBottomColor: 'rgba(255, 255, 255, 0.8)',
        borderRightColor: 'rgba(255, 255, 255, 0.8)',
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
        backgroundColor: colors.lavenderLight,
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
    fabShadow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: borderRadius.pill,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    fabSurface: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.pill,
        gap: spacing.sm,
    },
    fabText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
});
