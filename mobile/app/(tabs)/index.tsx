/**
 * HomeScreen - 복약 체크 화면
 * Neumorphism + Pastel Design
 */

import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Switch,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useMedicationStore } from '../../services/store';
import type { MedicationLog } from '../../services/types';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows, neumorphism } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard, NeumorphIconButton } from '../../components';

interface GroupedLogs {
    key: string;
    group_id: number | null;
    group_name: string | null;
    time_of_day: string;
    time_of_day_display: string;
    logs: MedicationLog[];
    allTaken: boolean;
}


export default function HomeScreen() {
    const router = useRouter();
    const { todayLogs, fetchTodayLogs, batchTakeMedications, isLoading } = useMedicationStore();
    const [refreshing, setRefreshing] = useState(false);
    const [takingGroup, setTakingGroup] = useState<string | null>(null);
    const [notificationEnabled, setNotificationEnabled] = useState(true);

    // 화면이 포커스될 때마다 데이터 새로고침
    useFocusEffect(
        useCallback(() => {
            fetchTodayLogs();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchTodayLogs();
        setRefreshing(false);
    };

    // 그룹화 로직
    const groupedLogs: GroupedLogs[] = [];
    const groupMap = new Map<string, GroupedLogs>();

    todayLogs.forEach((log: MedicationLog) => {
        const key = log.group_id
            ? `group_${log.group_id}_${log.time_of_day}`
            : `single_${log.id}`;

        if (!groupMap.has(key)) {
            groupMap.set(key, {
                key,
                group_id: log.group_id,
                group_name: log.group_name,
                time_of_day: log.time_of_day,
                time_of_day_display: log.time_of_day_display,
                logs: [],
                allTaken: true,
            });
        }
        const group = groupMap.get(key)!;
        group.logs.push(log);
        if (log.status !== 'taken') {
            group.allTaken = false;
        }
    });
    groupMap.forEach((group) => groupedLogs.push(group));
    const timeOrder: Record<string, number> = { morning: 1, noon: 2, evening: 3, night: 4 };
    groupedLogs.sort((a, b) => (timeOrder[a.time_of_day] || 5) - (timeOrder[b.time_of_day] || 5));

    const completedCount = todayLogs.filter((log) => log.status === 'taken').length;
    const totalCount = todayLogs.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleTakeGroup = async (group: GroupedLogs) => {
        if (group.allTaken) return;
        setTakingGroup(group.key);
        try {
            const pendingLogIds = group.logs
                .filter((log) => log.status !== 'taken')
                .map((log) => log.id);
            await batchTakeMedications(pendingLogIds);
        } catch (err) {
            console.error('Failed to take medications', err);
        } finally {
            setTakingGroup(null);
        }
    };

    const today = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
    });

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
                    <NeumorphIconButton style={styles.headerIconBtn}>
                        <MaterialCommunityIcons name="pill" size={32} color={colors.primary} />
                    </NeumorphIconButton>
                    <Text style={styles.headerTitle}>오늘의 약속</Text>
                    <Text style={styles.headerDate}>{today}</Text>
                </View>

                {/* 내 약 관리 바로가기 */}
                <TouchableOpacity
                    style={styles.manageMedsButton}
                    onPress={() => router.push('/(tabs)/medications' as any)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="list" size={16} color={colors.primary} />
                    <Text style={styles.manageMedsText}>내 약 관리</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textLight} />
                </TouchableOpacity>

                {/* 알림 토글 */}
                <NeumorphCard style={styles.cardSpacing}>
                    <View style={styles.rowBetween}>
                        <View style={styles.row}>
                            <View style={styles.insetIconCircle}>
                                <Ionicons
                                    name={notificationEnabled ? "notifications" : "notifications-off-outline"}
                                    size={20}
                                    color={notificationEnabled ? colors.primary : colors.textLight}
                                />
                            </View>
                            <Text style={styles.label}>복약 알림</Text>
                        </View>
                        <Switch
                            value={notificationEnabled}
                            onValueChange={setNotificationEnabled}
                            trackColor={{ false: colors.baseDark, true: colors.mintLight }}
                            thumbColor={notificationEnabled ? colors.mint : colors.baseLight}
                            ios_backgroundColor={colors.baseDark}
                        />
                    </View>
                </NeumorphCard>

                {/* 진행 상태 */}
                {totalCount > 0 && (
                    <NeumorphCard style={styles.cardSpacing}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.label}>오늘의 복약</Text>
                            <Text style={styles.countText}>
                                <Text style={styles.countHighlight}>{completedCount}</Text>
                                <Text style={styles.countDivider}> / </Text>
                                {totalCount}
                            </Text>
                        </View>
                        {/* 뉴모피즘 Inset 프로그레스 바 */}
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressFill, { width: `${progress}%` }]} />
                        </View>
                    </NeumorphCard>
                )}

                {/* 복약 목록 */}
                {isLoading && !refreshing ? (
                    <NeumorphCard style={styles.cardSpacing}>
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={colors.primary} size="large" />
                            <Text style={styles.loadingText}>불러오는 중...</Text>
                        </View>
                    </NeumorphCard>
                ) : groupedLogs.length === 0 ? (
                    <NeumorphCard style={[styles.cardSpacing, styles.emptyCard]}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.mint} />
                        </View>
                        <Text style={styles.emptyText}>오늘 복용할 약이 없습니다</Text>
                        <Text style={styles.emptySubtext}>새로운 약을 추가해보세요</Text>
                    </NeumorphCard>
                ) : (
                    groupedLogs.map((group) => (
                        <NeumorphCard
                            key={group.key}
                            style={[styles.cardSpacing, group.allTaken && styles.opacity60]}
                        >
                            {/* 그룹 헤더 */}
                            <View style={[styles.rowBetween, { marginBottom: spacing.lg }]}>
                                <View style={styles.row}>
                                    <View style={[styles.insetIconCircle, { backgroundColor: colors.mintLight }]}>
                                        <Feather name="package" size={16} color={colors.primary} />
                                    </View>
                                    <Text style={styles.groupName}>
                                        {group.group_name || group.logs[0]?.medication_name}
                                    </Text>
                                </View>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{group.time_of_day_display}</Text>
                                </View>
                            </View>

                            {/* 약 리스트 */}
                            <View style={{ marginBottom: spacing.lg }}>
                                {group.logs.map((log) => (
                                    <View key={log.id} style={styles.medItem}>
                                        <View style={[
                                            styles.checkbox,
                                            log.status === 'taken' && styles.checkboxChecked
                                        ]}>
                                            {log.status === 'taken' && (
                                                <Ionicons name="checkmark" size={14} color={colors.white} />
                                            )}
                                        </View>
                                        <Text style={[
                                            styles.medName,
                                            log.status === 'taken' && styles.medNameTaken
                                        ]}>
                                            {group.group_name ? log.medication_name : (log.medication_dosage || log.medication_name)}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* 복용 버튼 */}
                            <TouchableOpacity
                                onPress={() => handleTakeGroup(group)}
                                disabled={group.allTaken || takingGroup === group.key}
                                activeOpacity={0.8}
                            >
                                <View style={[
                                    styles.actionButton,
                                    group.allTaken ? styles.actionButtonDone : styles.actionButtonActive
                                ]}>
                                    {takingGroup === group.key ? (
                                        <ActivityIndicator color={colors.white} size="small" />
                                    ) : (
                                        <>
                                            <Ionicons
                                                name={group.allTaken ? "checkmark-circle" : "medical"}
                                                size={18}
                                                color={group.allTaken ? colors.textLight : colors.white}
                                            />
                                            <Text style={[
                                                styles.actionButtonText,
                                                group.allTaken && styles.actionButtonTextDone
                                            ]}>
                                                {group.allTaken ? '복용 완료' : '지금 복용하기'}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </NeumorphCard>
                    ))
                )}

                {/* 하단 여백 */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
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
        paddingBottom: 100,
    },

    // 헤더
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxxl,
    },
    headerIconBtn: {
        width: 70,
        height: 70,
        marginBottom: spacing.lg,
    },
    headerTitle: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    headerDate: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },
    manageMedsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.pill,
        backgroundColor: colors.base,
        gap: spacing.xs,
        marginBottom: spacing.lg,
        ...shadows.soft,
    },
    manageMedsText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
    },

    // 뉴모피즘 카드
    neumorphContainer: {
        position: 'relative',
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
        borderRadius: borderRadius.xxl,
        padding: spacing.xl,
    },
    cardSpacing: {
        marginBottom: spacing.xl,
    },

    // 뉴모피즘 아이콘 버튼
    headerIconBtn: {
        marginBottom: spacing.lg,
    },

    // 레이아웃
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    // Inset 아이콘 원
    insetIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        borderWidth: 2,
        borderTopColor: 'rgba(184, 196, 206, 0.4)',
        borderLeftColor: 'rgba(184, 196, 206, 0.4)',
        borderBottomColor: 'rgba(255, 255, 255, 0.8)',
        borderRightColor: 'rgba(255, 255, 255, 0.8)',
    },

    label: {
        fontSize: fontSize.lg,
        color: colors.text,
        fontWeight: fontWeight.semibold,
    },
    countText: {
        fontSize: fontSize.xxl,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },
    countHighlight: {
        color: colors.primary,
        fontWeight: fontWeight.bold,
    },
    countDivider: {
        color: colors.textLight,
    },

    // 프로그레스 바 (Inset 스타일)
    progressBarBg: {
        height: 10,
        backgroundColor: colors.base,
        borderRadius: 5,
        marginTop: spacing.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderTopColor: 'rgba(184, 196, 206, 0.4)',
        borderLeftColor: 'rgba(184, 196, 206, 0.4)',
        borderBottomColor: 'rgba(255, 255, 255, 0.8)',
        borderRightColor: 'rgba(255, 255, 255, 0.8)',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.mint,
        borderRadius: 4,
    },

    // 로딩
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
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
        backgroundColor: colors.mintLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
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
    opacity60: {
        opacity: 0.6,
    },

    // 그룹
    groupName: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    badge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.pill,
        backgroundColor: colors.blueLight,
    },
    badgeText: {
        color: colors.blueDark,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
    },

    // 약 아이템
    medItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        paddingLeft: spacing.xs,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        borderWidth: 2,
        borderColor: colors.textLight,
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    medName: {
        fontSize: fontSize.base,
        color: colors.text,
        fontWeight: fontWeight.medium,
    },
    medNameTaken: {
        textDecorationLine: 'line-through',
        color: colors.textLight,
    },

    // 액션 버튼
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: borderRadius.pill,
        gap: spacing.sm,
    },
    actionButtonActive: {
        backgroundColor: colors.primary,
        ...shadows.mint,
    },
    actionButtonDone: {
        backgroundColor: colors.base,
        borderWidth: 2,
        borderTopColor: 'rgba(184, 196, 206, 0.4)',
        borderLeftColor: 'rgba(184, 196, 206, 0.4)',
        borderBottomColor: 'rgba(255, 255, 255, 0.8)',
        borderRightColor: 'rgba(255, 255, 255, 0.8)',
    },
    actionButtonText: {
        color: colors.white,
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
    },
    actionButtonTextDone: {
        color: colors.textLight,
    },
});
