/**
 * SeniorsScreen - 보호자용 시니어 모니터링 화면
 * 연결된 시니어의 복약 현황을 모니터링
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
    Platform,
    Modal,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useMedicationStore } from '../../services/store';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard, NeumorphIconButton } from '../../components';

interface Senior {
    id: number;
    name: string;
    role: string;
    relationId: number;
}

interface TodaySummary {
    total: number;
    taken: number;
    pending: number;
}

interface MedicationLog {
    id: number;
    medication_name: string;
    time_of_day: string;
    time_of_day_display: string;
    status: 'pending' | 'taken' | 'missed';
}

interface SeniorMedication {
    id: number;
    name: string;
    dosage: string;
    group_name?: string;
}

export default function SeniorsScreen() {
    const user = useMedicationStore((state) => state.user);
    const [seniors, setSeniors] = useState<Senior[]>([]);
    const [selectedSenior, setSelectedSenior] = useState<Senior | null>(null);
    const [todayData, setTodayData] = useState<{ summary: TodaySummary; logs: MedicationLog[] } | null>(null);
    const [medications, setMedications] = useState<SeniorMedication[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [alertModalVisible, setAlertModalVisible] = useState(false);
    const [sendingAlert, setSendingAlert] = useState(false);

    // 연결된 시니어 목록 조회
    const fetchSeniors = async () => {
        try {
            const response = await api.guardians.list();
            const relations = response.data.results || response.data || [];
            
            // 보호자 입장에서 연결된 시니어 목록 추출
            const seniorList: Senior[] = relations
                .filter((rel: any) => rel.senior !== user?.id)
                .map((rel: any) => ({
                    id: rel.senior,
                    name: rel.senior_name || '시니어',
                    role: 'senior',
                    relationId: rel.id,
                }));
            
            setSeniors(seniorList);
            
            // 첫 번째 시니어 자동 선택
            if (seniorList.length > 0 && !selectedSenior) {
                setSelectedSenior(seniorList[0]);
            }
        } catch (error) {
            console.error('Failed to fetch seniors:', error);
        }
    };

    // 선택된 시니어의 오늘 복약 현황 조회
    const fetchTodayData = async (seniorId: number) => {
        try {
            const response = await api.seniors.getToday(seniorId);
            setTodayData({
                summary: response.data.summary,
                logs: response.data.logs,
            });
        } catch (error) {
            console.error('Failed to fetch today data:', error);
            setTodayData(null);
        }
    };

    // 선택된 시니어의 약 목록 조회
    const fetchMedications = async (seniorId: number) => {
        try {
            const response = await api.seniors.getMedications(seniorId);
            setMedications(response.data.medications || []);
        } catch (error) {
            console.error('Failed to fetch medications:', error);
            setMedications([]);
        }
    };

    // 시니어 데이터 전체 로드
    const loadSeniorData = async (senior: Senior) => {
        setIsLoading(true);
        try {
            await Promise.all([
                fetchTodayData(senior.id),
                fetchMedications(senior.id),
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchSeniors();
        }, [])
    );

    useEffect(() => {
        if (selectedSenior) {
            loadSeniorData(selectedSenior);
        }
    }, [selectedSenior]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSeniors();
        if (selectedSenior) {
            await loadSeniorData(selectedSenior);
        }
        setRefreshing(false);
    };

    // 알림 보내기
    const handleSendAlert = async (messageType: string) => {
        if (!selectedSenior) return;
        
        setSendingAlert(true);
        try {
            await api.alerts.send({
                recipient_id: selectedSenior.id,
                message_type: messageType,
            });
            Alert.alert('알림 전송', `${selectedSenior.name}님에게 알림을 보냈습니다.`);
            setAlertModalVisible(false);
        } catch (error) {
            Alert.alert('오류', '알림 전송에 실패했습니다.');
        } finally {
            setSendingAlert(false);
        }
    };

    const progress = todayData?.summary
        ? (todayData.summary.taken / Math.max(todayData.summary.total, 1)) * 100
        : 0;

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
                        <Ionicons name="people" size={32} color={colors.primary} />
                    </NeumorphIconButton>
                    <Text style={styles.headerTitle}>시니어 관리</Text>
                    <Text style={styles.headerSubtitle}>연결된 시니어의 복약 현황을 확인하세요</Text>
                </View>

                {/* 시니어가 없는 경우 */}
                {seniors.length === 0 ? (
                    <NeumorphCard style={[styles.cardSpacing, styles.emptyCard]}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="person-add-outline" size={48} color={colors.primary} />
                        </View>
                        <Text style={styles.emptyText}>연결된 시니어가 없습니다</Text>
                        <Text style={styles.emptySubtext}>설정에서 시니어와 연결해주세요</Text>
                    </NeumorphCard>
                ) : (
                    <>
                        {/* 시니어 선택 */}
                        <NeumorphCard style={styles.cardSpacing}>
                            <Text style={styles.sectionTitle}>시니어 선택</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.seniorSelector}
                            >
                                {seniors.map((senior) => (
                                    <TouchableOpacity
                                        key={senior.id}
                                        style={[
                                            styles.seniorChip,
                                            selectedSenior?.id === senior.id && styles.seniorChipSelected,
                                        ]}
                                        onPress={() => setSelectedSenior(senior)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[
                                            styles.seniorAvatar,
                                            selectedSenior?.id === senior.id && styles.seniorAvatarSelected,
                                        ]}>
                                            <Text style={[
                                                styles.seniorAvatarText,
                                                selectedSenior?.id === senior.id && styles.seniorAvatarTextSelected,
                                            ]}>
                                                {senior.name.charAt(0)}
                                            </Text>
                                        </View>
                                        <Text style={[
                                            styles.seniorName,
                                            selectedSenior?.id === senior.id && styles.seniorNameSelected,
                                        ]}>
                                            {senior.name}
                                        </Text>
                                        {selectedSenior?.id === senior.id && (
                                            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </NeumorphCard>

                        {isLoading ? (
                            <NeumorphCard style={styles.cardSpacing}>
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator color={colors.primary} size="large" />
                                    <Text style={styles.loadingText}>불러오는 중...</Text>
                                </View>
                            </NeumorphCard>
                        ) : selectedSenior && (
                            <>
                                {/* 오늘의 복약 현황 */}
                                <NeumorphCard style={styles.cardSpacing}>
                                    <View style={styles.sectionHeader}>
                                        <View style={styles.row}>
                                            <View style={[styles.insetIconCircle, { backgroundColor: colors.mintLight }]}>
                                                <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={colors.primary} />
                                            </View>
                                            <Text style={styles.sectionTitle}>오늘의 복약 현황</Text>
                                        </View>
                                        <Text style={styles.countText}>
                                            <Text style={styles.countHighlight}>{todayData?.summary.taken || 0}</Text>
                                            <Text style={styles.countDivider}> / </Text>
                                            {todayData?.summary.total || 0}
                                        </Text>
                                    </View>

                                    {/* 프로그레스 바 */}
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                                    </View>

                                    {/* 복약 로그 목록 */}
                                    {todayData?.logs && todayData.logs.length > 0 ? (
                                        <View style={styles.logList}>
                                            {todayData.logs.map((log) => (
                                                <View key={log.id} style={styles.logItem}>
                                                    <View style={[
                                                        styles.statusDot,
                                                        log.status === 'taken' && styles.statusDotTaken,
                                                        log.status === 'missed' && styles.statusDotMissed,
                                                    ]} />
                                                    <Text style={[
                                                        styles.logMedName,
                                                        log.status === 'taken' && styles.logMedNameTaken,
                                                    ]}>
                                                        {log.medication_name}
                                                    </Text>
                                                    <View style={styles.timeBadge}>
                                                        <Text style={styles.timeBadgeText}>{log.time_of_day_display}</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text style={styles.noDataText}>오늘 복용할 약이 없습니다</Text>
                                    )}
                                </NeumorphCard>

                                {/* 복용 중인 약 */}
                                <NeumorphCard style={styles.cardSpacing}>
                                    <View style={styles.sectionHeader}>
                                        <View style={styles.row}>
                                            <View style={[styles.insetIconCircle, { backgroundColor: colors.blueLight }]}>
                                                <MaterialCommunityIcons name="pill" size={18} color={colors.blueDark} />
                                            </View>
                                            <Text style={styles.sectionTitle}>복용 중인 약</Text>
                                        </View>
                                        <Text style={styles.countBadge}>{medications.length}개</Text>
                                    </View>

                                    {medications.length > 0 ? (
                                        <View style={styles.medList}>
                                            {medications.slice(0, 5).map((med) => (
                                                <View key={med.id} style={styles.medItem}>
                                                    <Ionicons name="medical" size={16} color={colors.primary} />
                                                    <Text style={styles.medItemName}>{med.name}</Text>
                                                    {med.dosage && (
                                                        <Text style={styles.medItemDosage}>{med.dosage}</Text>
                                                    )}
                                                </View>
                                            ))}
                                            {medications.length > 5 && (
                                                <Text style={styles.moreText}>외 {medications.length - 5}개</Text>
                                            )}
                                        </View>
                                    ) : (
                                        <Text style={styles.noDataText}>등록된 약이 없습니다</Text>
                                    )}
                                </NeumorphCard>

                                {/* 알림 보내기 버튼 */}
                                <TouchableOpacity
                                    style={styles.alertButton}
                                    onPress={() => setAlertModalVisible(true)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="notifications" size={20} color={colors.white} />
                                    <Text style={styles.alertButtonText}>{selectedSenior.name}님에게 알림 보내기</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </>
                )}

                {/* 하단 여백 */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* 알림 보내기 모달 */}
            <Modal
                visible={alertModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setAlertModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>알림 보내기</Text>
                        <Text style={styles.modalSubtitle}>{selectedSenior?.name}님에게</Text>

                        <View style={styles.alertOptions}>
                            <TouchableOpacity
                                style={styles.alertOption}
                                onPress={() => handleSendAlert('check_in')}
                                disabled={sendingAlert}
                            >
                                <View style={[styles.alertOptionIcon, { backgroundColor: colors.mintLight }]}>
                                    <Ionicons name="hand-left" size={24} color={colors.primary} />
                                </View>
                                <Text style={styles.alertOptionText}>안부 확인</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.alertOption}
                                onPress={() => handleSendAlert('reminder')}
                                disabled={sendingAlert}
                            >
                                <View style={[styles.alertOptionIcon, { backgroundColor: colors.blueLight }]}>
                                    <MaterialCommunityIcons name="pill" size={24} color={colors.blueDark} />
                                </View>
                                <Text style={styles.alertOptionText}>약 드셨나요?</Text>
                            </TouchableOpacity>
                        </View>

                        {sendingAlert && (
                            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
                        )}

                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setAlertModalVisible(false)}
                        >
                            <Text style={styles.modalCloseText}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
    headerSubtitle: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },

    cardSpacing: {
        marginBottom: spacing.xl,
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

    // 시니어 선택
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.md,
    },
    seniorSelector: {
        flexDirection: 'row',
        marginHorizontal: -spacing.sm,
    },
    seniorChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.sm,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.base,
        borderWidth: 2,
        borderColor: colors.baseDark,
    },
    seniorChipSelected: {
        backgroundColor: colors.mintLight,
        borderColor: colors.primary,
    },
    seniorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.baseDark,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    seniorAvatarSelected: {
        backgroundColor: colors.primary,
    },
    seniorAvatarText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.textSecondary,
    },
    seniorAvatarTextSelected: {
        color: colors.white,
    },
    seniorName: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        color: colors.text,
        marginRight: spacing.sm,
    },
    seniorNameSelected: {
        color: colors.primary,
        fontWeight: fontWeight.bold,
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

    // 섹션 헤더
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    insetIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    countText: {
        fontSize: fontSize.xl,
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
    countBadge: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },

    // 프로그레스 바
    progressBarBg: {
        height: 10,
        backgroundColor: colors.baseDark,
        borderRadius: 5,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.mint,
        borderRadius: 5,
    },

    // 복약 로그 목록
    logList: {
        marginTop: spacing.sm,
    },
    logItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.baseDark,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.textLight,
        marginRight: spacing.md,
    },
    statusDotTaken: {
        backgroundColor: colors.mint,
    },
    statusDotMissed: {
        backgroundColor: colors.error,
    },
    logMedName: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.text,
        fontWeight: fontWeight.medium,
    },
    logMedNameTaken: {
        color: colors.textLight,
        textDecorationLine: 'line-through',
    },
    timeBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.blueLight,
    },
    timeBadgeText: {
        fontSize: fontSize.xs,
        color: colors.blueDark,
        fontWeight: fontWeight.medium,
    },

    // 약 목록
    medList: {
        marginTop: spacing.sm,
    },
    medItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    medItemName: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.text,
        fontWeight: fontWeight.medium,
        marginLeft: spacing.sm,
    },
    medItemDosage: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    moreText: {
        fontSize: fontSize.sm,
        color: colors.textLight,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    noDataText: {
        fontSize: fontSize.base,
        color: colors.textLight,
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },

    // 알림 버튼
    alertButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.xl,
        gap: spacing.sm,
        ...shadows.mint,
    },
    alertButtonText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },

    // 모달
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: colors.base,
        borderRadius: borderRadius.xxl,
        padding: spacing.xl,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    modalSubtitle: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
    },
    alertOptions: {
        flexDirection: 'row',
        gap: spacing.lg,
    },
    alertOption: {
        alignItems: 'center',
        padding: spacing.lg,
    },
    alertOptionIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    alertOptionText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.text,
    },
    modalCloseButton: {
        marginTop: spacing.xl,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xxl,
    },
    modalCloseText: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },

});
