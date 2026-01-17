/**
 * SeniorCalendarScreen - 보호자용 시니어 캘린더 화면
 * 연결된 시니어의 복약 캘린더를 확인
 */

import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import type { CalendarDailySummary, HospitalVisit } from '../../services/types';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard, NeumorphIconButton } from '../../components';
import { useMedicationStore } from '../../services/store';

interface MarkedDates {
    [date: string]: {
        marked?: boolean;
        dotColor?: string;
        selected?: boolean;
        selectedColor?: string;
    };
}

interface Senior {
    id: number;
    name: string;
    relationId: number;
}

export default function SeniorCalendarScreen() {
    const user = useMedicationStore((state) => state.user);
    const [seniors, setSeniors] = useState<Senior[]>([]);
    const [selectedSenior, setSelectedSenior] = useState<Senior | null>(null);
    
    const [dailySummary, setDailySummary] = useState<CalendarDailySummary>({});
    const [hospitalVisits, setHospitalVisits] = useState<HospitalVisit[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [currentMonth, setCurrentMonth] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
    });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // 연결된 시니어 목록 조회
    const fetchSeniors = async () => {
        try {
            const response = await api.guardians.list();
            const relations = response.data.results || response.data || [];
            
            const seniorList: Senior[] = relations
                .filter((rel: any) => rel.senior !== user?.id)
                .map((rel: any) => ({
                    id: rel.senior,
                    name: rel.senior_name || '시니어',
                    relationId: rel.id,
                }));
            
            setSeniors(seniorList);
            
            if (seniorList.length > 0 && !selectedSenior) {
                setSelectedSenior(seniorList[0]);
            }
        } catch (error) {
            console.error('Failed to fetch seniors:', error);
        }
    };

    // 시니어 캘린더 데이터 가져오기
    const fetchCalendarData = useCallback(async (seniorId: number, year: number, month: number) => {
        setLoading(true);
        try {
            const res = await api.seniors.getCalendar(seniorId, year, month);
            setDailySummary(res.data.daily_summary || {});
            setHospitalVisits(res.data.hospital_visits || []);
        } catch (error) {
            console.error('Fetch calendar data error:', error);
            setDailySummary({});
            setHospitalVisits([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchSeniors();
        }, [])
    );

    useEffect(() => {
        if (selectedSenior) {
            fetchCalendarData(selectedSenior.id, currentMonth.year, currentMonth.month);
        }
    }, [selectedSenior, currentMonth, fetchCalendarData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSeniors();
        if (selectedSenior) {
            await fetchCalendarData(selectedSenior.id, currentMonth.year, currentMonth.month);
        }
        setRefreshing(false);
    };

    // 병원 방문일 날짜 목록
    const hospitalVisitDates = hospitalVisits.map(v => v.date);

    // 캘린더 마커 생성 (기존 calendar.tsx와 동일한 로직)
    const getMarkedDates = (): MarkedDates => {
        const marked: MarkedDates = {};

        // 복약 현황 마커
        Object.entries(dailySummary).forEach(([date, summary]) => {
            if (summary.total === 0) return;

            let dotColor = colors.textLight;
            if (summary.taken === summary.total) {
                dotColor = colors.primary; // 완료: 초록
            } else if (summary.taken > 0) {
                dotColor = '#FFC107'; // 일부: 노랑
            } else if (summary.missed > 0) {
                dotColor = colors.danger; // 미복용: 빨강
            }

            marked[date] = {
                marked: true,
                dotColor,
            };
        });

        // 병원 방문일 마커 (파란색)
        hospitalVisitDates.forEach(date => {
            marked[date] = {
                ...marked[date],
                marked: true,
                dotColor: '#2196F3', // 파란색 - 병원 방문일
            };
        });

        // 선택된 날짜 표시
        if (selectedDate) {
            marked[selectedDate] = {
                ...marked[selectedDate],
                selected: true,
                selectedColor: hospitalVisitDates.includes(selectedDate) ? '#2196F3' : colors.primary,
            };
        }

        return marked;
    };

    const handleDayPress = (day: DateData) => {
        setSelectedDate(day.dateString);
    };

    const handleMonthChange = (month: DateData) => {
        setCurrentMonth({
            year: month.year,
            month: month.month,
        });
    };

    // 날짜 요약 텍스트
    const getDateSummary = () => {
        const summary = dailySummary[selectedDate];
        if (!summary || summary.total === 0) {
            return '복약 예정 없음';
        }
        if (summary.taken === summary.total) {
            return `모든 약 복용 완료 (${summary.taken}/${summary.total})`;
        }
        return `${summary.taken}/${summary.total} 복용`;
    };

    // 선택된 날짜의 병원 방문 정보
    const getSelectedDateHospitalVisits = () => {
        return hospitalVisits.filter(v => v.date === selectedDate);
    };

    const formatSelectedDate = () => {
        const date = new Date(selectedDate);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
        });
    };

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
                        <Ionicons name="calendar" size={32} color={colors.primary} />
                    </NeumorphIconButton>
                    <Text style={styles.headerTitle}>시니어 캘린더</Text>
                    <Text style={styles.headerSubtitle}>
                        {selectedSenior ? `${selectedSenior.name}님의 복약 현황` : '시니어를 선택하세요'}
                    </Text>
                </View>

                {/* 시니어가 없는 경우 */}
                {seniors.length === 0 ? (
                    <NeumorphCard style={[styles.cardSpacing, styles.emptyCard]}>
                        <Ionicons name="person-add-outline" size={48} color={colors.primary} />
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
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </NeumorphCard>

                        {/* 범례 */}
                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                                <Text style={styles.legendText}>완료</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
                                <Text style={styles.legendText}>일부</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                                <Text style={styles.legendText}>미복용</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                                <Text style={styles.legendText}>병원</Text>
                            </View>
                        </View>

                        {/* 캘린더 */}
                        <NeumorphCard style={styles.calendarCard}>
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator color={colors.primary} size="large" />
                                </View>
                            ) : (
                                <Calendar
                                    current={`${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-01`}
                                    onDayPress={handleDayPress}
                                    onMonthChange={handleMonthChange}
                                    markedDates={getMarkedDates()}
                                    theme={{
                                        backgroundColor: 'transparent',
                                        calendarBackground: 'transparent',
                                        textSectionTitleColor: colors.textSecondary,
                                        selectedDayBackgroundColor: colors.primary,
                                        selectedDayTextColor: colors.white,
                                        todayTextColor: colors.primary,
                                        dayTextColor: colors.text,
                                        textDisabledColor: colors.textLight,
                                        dotColor: colors.primary,
                                        arrowColor: colors.primary,
                                        monthTextColor: colors.text,
                                        textMonthFontWeight: 'bold',
                                        textDayFontSize: 14,
                                        textMonthFontSize: 16,
                                        textDayHeaderFontSize: 12,
                                    }}
                                />
                            )}
                        </NeumorphCard>

                        {/* 병원 방문 알림 */}
                        {getSelectedDateHospitalVisits().length > 0 && (
                            <NeumorphCard style={styles.hospitalCard}>
                                <View style={styles.hospitalHeader}>
                                    <MaterialCommunityIcons name="hospital-building" size={24} color="#2196F3" />
                                    <Text style={styles.hospitalTitle}>병원 방문일</Text>
                                </View>
                                {getSelectedDateHospitalVisits().map((visit) => (
                                    <View key={visit.medication_id} style={styles.hospitalItem}>
                                        <View style={styles.hospitalItemInfo}>
                                            <Text style={styles.hospitalMedName}>{visit.medication_name}</Text>
                                            <Text style={styles.hospitalDaysText}>
                                                {visit.days_supply}일치 처방 종료
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                                <Text style={styles.hospitalHint}>
                                    {selectedSenior?.name}님의 약이 떨어지는 날입니다.
                                </Text>
                            </NeumorphCard>
                        )}

                        {/* 선택된 날짜 상세 */}
                        <NeumorphCard style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailDate}>{formatSelectedDate()}</Text>
                                <Text style={styles.detailSummary}>{getDateSummary()}</Text>
                            </View>

                            {dailySummary[selectedDate] && dailySummary[selectedDate].total > 0 ? (
                                <View style={styles.summaryStats}>
                                    <View style={styles.statItem}>
                                        <View style={[styles.statIcon, { backgroundColor: colors.mintLight }]}>
                                            <Ionicons name="checkmark" size={16} color={colors.primary} />
                                        </View>
                                        <Text style={styles.statValue}>{dailySummary[selectedDate].taken}</Text>
                                        <Text style={styles.statLabel}>복용</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <View style={[styles.statIcon, { backgroundColor: colors.dangerLight }]}>
                                            <Ionicons name="close" size={16} color={colors.danger} />
                                        </View>
                                        <Text style={styles.statValue}>{dailySummary[selectedDate].missed}</Text>
                                        <Text style={styles.statLabel}>미복용</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <View style={[styles.statIcon, { backgroundColor: colors.baseLight }]}>
                                            <Ionicons name="medical" size={16} color={colors.textSecondary} />
                                        </View>
                                        <Text style={styles.statValue}>{dailySummary[selectedDate].total}</Text>
                                        <Text style={styles.statLabel}>전체</Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.emptyLogs}>
                                    <Ionicons name="calendar-outline" size={40} color={colors.textLight} />
                                    <Text style={styles.emptyLogsText}>이 날짜에 복약 기록이 없습니다</Text>
                                </View>
                            )}
                        </NeumorphCard>
                    </>
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
    },

    // 헤더
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    headerIconBtn: {
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
    },

    cardSpacing: {
        marginBottom: spacing.xl,
    },

    // 빈 상태
    emptyCard: {
        alignItems: 'center',
        paddingVertical: spacing.xxxxl,
    },
    emptyText: {
        fontSize: fontSize.lg,
        color: colors.text,
        fontWeight: fontWeight.semibold,
        marginTop: spacing.lg,
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
    },
    seniorNameSelected: {
        color: colors.primary,
        fontWeight: fontWeight.bold,
    },

    // 범례
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xl,
        marginBottom: spacing.xl,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },

    // 캘린더 카드
    calendarCard: {
        marginBottom: spacing.xl,
        padding: spacing.md,
    },
    loadingContainer: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // 병원 방문 카드
    hospitalCard: {
        marginBottom: spacing.lg,
        padding: spacing.lg,
        backgroundColor: 'rgba(33, 150, 243, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(33, 150, 243, 0.2)',
    },
    hospitalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    hospitalTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: '#2196F3',
    },
    hospitalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(33, 150, 243, 0.1)',
    },
    hospitalItemInfo: {
        flex: 1,
    },
    hospitalMedName: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        color: colors.text,
    },
    hospitalDaysText: {
        fontSize: fontSize.sm,
        color: '#2196F3',
    },
    hospitalHint: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginTop: spacing.md,
        textAlign: 'center',
    },

    // 상세 카드
    detailCard: {
        padding: spacing.xl,
    },
    detailHeader: {
        marginBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: spacing.lg,
    },
    detailDate: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    detailSummary: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
    },

    // 통계
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: spacing.md,
    },
    statItem: {
        alignItems: 'center',
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    statValue: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    statLabel: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
    },

    // 빈 상태
    emptyLogs: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyLogsText: {
        fontSize: fontSize.sm,
        color: colors.textLight,
        marginTop: spacing.md,
    },
});
