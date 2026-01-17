/**
 * CalendarScreen - 복약 캘린더 화면
 * 월별 복약 현황을 캘린더로 시각화
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
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import type { CalendarData, CalendarDailySummary, MedicationLog, HospitalVisit } from '../../services/types';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard, NeumorphIconButton } from '../../components';

interface MarkedDates {
    [date: string]: {
        marked?: boolean;
        dotColor?: string;
        selected?: boolean;
        selectedColor?: string;
    };
}

export default function CalendarScreen() {
    const [dailySummary, setDailySummary] = useState<CalendarDailySummary>({});
    const [hospitalVisits, setHospitalVisits] = useState<HospitalVisit[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [selectedDateLogs, setSelectedDateLogs] = useState<MedicationLog[]>([]);
    const [currentMonth, setCurrentMonth] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
    });
    const [loading, setLoading] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    
    // 병원 방문일 수정 모달 상태
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingVisits, setEditingVisits] = useState<HospitalVisit[]>([]);  // 일괄 수정용 배열
    const [editDaysSupply, setEditDaysSupply] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // 월별 캘린더 데이터 가져오기
    const fetchCalendarData = useCallback(async (year: number, month: number) => {
        setLoading(true);
        try {
            const res = await api.logs.calendar(year, month);
            setDailySummary(res.data.daily_summary || {});
            setHospitalVisits(res.data.hospital_visits || []);
        } catch (error) {
            console.error('Fetch calendar data error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 특정 날짜의 복약 기록 가져오기
    const fetchDateLogs = useCallback(async (date: string) => {
        setLoadingLogs(true);
        try {
            const res = await api.logs.byDate(date);
            setSelectedDateLogs(res.data);
        } catch (error) {
            console.error('Fetch date logs error:', error);
            setSelectedDateLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    }, []);

    useEffect(() => {
        fetchCalendarData(currentMonth.year, currentMonth.month);
    }, [currentMonth, fetchCalendarData]);

    useEffect(() => {
        if (selectedDate) {
            fetchDateLogs(selectedDate);
        }
    }, [selectedDate, fetchDateLogs]);

    // 병원 방문일 날짜 목록
    const hospitalVisitDates = hospitalVisits.map(v => v.date);

    // 캘린더 마커 생성
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
            return `✅ 모든 약 복용 완료 (${summary.taken}/${summary.total})`;
        }
        return `${summary.taken}/${summary.total} 복용`;
    };

    // 선택된 날짜의 병원 방문 정보
    const getSelectedDateHospitalVisits = () => {
        return hospitalVisits.filter(v => v.date === selectedDate);
    };

    // 병원 방문일 일괄 수정 모달 열기
    const openBatchEditModal = () => {
        const visits = getSelectedDateHospitalVisits();
        if (visits.length === 0) return;
        
        setEditingVisits(visits);
        // 첫 번째 약의 정보를 기본값으로 사용
        const firstVisit = visits[0];
        setEditDaysSupply(firstVisit.days_supply.toString());
        // start_date 계산 (end_date - days_supply)
        const endDate = new Date(firstVisit.date);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - firstVisit.days_supply);
        setEditStartDate(startDate.toISOString().split('T')[0]);
        setEditModalVisible(true);
    };

    // 병원 방문일 일괄 저장
    const handleSaveVisit = async () => {
        if (editingVisits.length === 0) return;
        
        const daysSupplyNum = parseInt(editDaysSupply);
        if (!daysSupplyNum || daysSupplyNum <= 0) {
            Alert.alert('오류', '올바른 처방 일수를 입력해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            // 모든 약품을 일괄 수정
            await Promise.all(
                editingVisits.map(visit => 
                    api.medications.update(visit.medication_id, {
                        days_supply: daysSupplyNum,
                        start_date: editStartDate,
                    })
                )
            );
            
            setEditModalVisible(false);
            // 캘린더 데이터 새로고침
            fetchCalendarData(currentMonth.year, currentMonth.month);
            Alert.alert('완료', `${editingVisits.length}개 약의 병원 방문일이 수정되었습니다.`);
        } catch (error) {
            console.error('Update medication error:', error);
            Alert.alert('오류', '수정에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    // 새 종료일 계산
    const calculateNewEndDate = () => {
        if (!editStartDate || !editDaysSupply) return null;
        const start = new Date(editStartDate);
        start.setDate(start.getDate() + parseInt(editDaysSupply));
        return start.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
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
            >
                {/* 헤더 */}
                <View style={styles.header}>
                    <NeumorphIconButton style={styles.headerIconBtn}>
                        <Ionicons name="calendar" size={32} color={colors.primary} />
                    </NeumorphIconButton>
                    <Text style={styles.headerTitle}>복약 캘린더</Text>
                    <Text style={styles.headerSubtitle}>매일의 복약 현황을 확인하세요</Text>
                </View>

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
                            약이 떨어지는 날입니다. 병원 방문을 예약하세요.
                        </Text>
                        <TouchableOpacity 
                            style={styles.batchEditButton}
                            onPress={openBatchEditModal}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="pencil" size={16} color="#2196F3" />
                            <Text style={styles.batchEditButtonText}>
                                {getSelectedDateHospitalVisits().length > 1 
                                    ? `${getSelectedDateHospitalVisits().length}개 약 일괄 수정`
                                    : '날짜 수정'
                                }
                            </Text>
                        </TouchableOpacity>
                    </NeumorphCard>
                )}

                {/* 선택된 날짜 상세 */}
                <NeumorphCard style={styles.detailCard}>
                    <View style={styles.detailHeader}>
                        <Text style={styles.detailDate}>{formatSelectedDate()}</Text>
                        <Text style={styles.detailSummary}>{getDateSummary()}</Text>
                    </View>

                    {loadingLogs ? (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
                    ) : selectedDateLogs.length === 0 ? (
                        <View style={styles.emptyLogs}>
                            <Ionicons name="calendar-outline" size={40} color={colors.textLight} />
                            <Text style={styles.emptyLogsText}>이 날짜에 복약 기록이 없습니다</Text>
                        </View>
                    ) : (
                        <View style={styles.logsList}>
                            {selectedDateLogs.map((log) => (
                                <View key={log.id} style={styles.logItem}>
                                    <View style={[
                                        styles.logStatus,
                                        log.status === 'taken' ? styles.logStatusTaken :
                                            log.status === 'missed' ? styles.logStatusMissed :
                                                styles.logStatusPending
                                    ]}>
                                        <Ionicons
                                            name={
                                                log.status === 'taken' ? 'checkmark' :
                                                    log.status === 'missed' ? 'close' : 'time-outline'
                                            }
                                            size={14}
                                            color={colors.white}
                                        />
                                    </View>
                                    <View style={styles.logInfo}>
                                        <Text style={styles.logName}>{log.medication_name}</Text>
                                        <Text style={styles.logTime}>
                                            {log.time_of_day_display} • {log.medication_dosage}
                                        </Text>
                                    </View>
                                    <Text style={[
                                        styles.logStatusText,
                                        log.status === 'taken' && styles.logStatusTextTaken,
                                        log.status === 'missed' && styles.logStatusTextMissed,
                                    ]}>
                                        {log.status_display}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </NeumorphCard>

                {/* 하단 여백 */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* 병원 방문일 수정 모달 */}
            <Modal
                visible={editModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <MaterialCommunityIcons name="hospital-building" size={24} color="#2196F3" />
                            <Text style={styles.modalTitle}>병원 방문일 수정</Text>
                        </View>

                        {editingVisits.length > 0 && (
                            <>
                                {/* 수정 대상 약 목록 */}
                                <View style={styles.modalMedList}>
                                    {editingVisits.map((visit, index) => (
                                        <Text key={visit.medication_id} style={styles.modalMedName}>
                                            {visit.medication_name}
                                            {index < editingVisits.length - 1 ? ', ' : ''}
                                        </Text>
                                    ))}
                                </View>
                                {editingVisits.length > 1 && (
                                    <Text style={styles.modalBatchNote}>
                                        {editingVisits.length}개 약의 처방 일수를 동시에 수정합니다
                                    </Text>
                                )}

                                {/* 시작일 표시 */}
                                <View style={styles.modalField}>
                                    <Text style={styles.modalLabel}>복용 시작일</Text>
                                    <View style={styles.modalDateDisplay}>
                                        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                        <Text style={styles.modalDateText}>
                                            {new Date(editStartDate).toLocaleDateString('ko-KR', {
                                                year: 'numeric', month: 'long', day: 'numeric'
                                            })}
                                        </Text>
                                    </View>
                                </View>

                                {/* 처방 일수 입력 */}
                                <View style={styles.modalField}>
                                    <Text style={styles.modalLabel}>처방 일수</Text>
                                    <View style={styles.modalInputRow}>
                                        <TextInput
                                            style={styles.modalInput}
                                            value={editDaysSupply}
                                            onChangeText={(text) => setEditDaysSupply(text.replace(/[^0-9]/g, ''))}
                                            keyboardType="number-pad"
                                            maxLength={3}
                                        />
                                        <Text style={styles.modalInputUnit}>일</Text>
                                    </View>
                                </View>

                                {/* 새 종료일 미리보기 */}
                                {calculateNewEndDate() && (
                                    <View style={styles.modalPreview}>
                                        <Ionicons name="arrow-forward" size={16} color="#2196F3" />
                                        <Text style={styles.modalPreviewText}>
                                            새 병원 방문일: {calculateNewEndDate()}
                                        </Text>
                                    </View>
                                )}

                                {/* 버튼들 */}
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.modalCancelButton}
                                        onPress={() => setEditModalVisible(false)}
                                    >
                                        <Text style={styles.modalCancelText}>취소</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalSaveButton, isSaving && styles.modalButtonDisabled]}
                                        onPress={handleSaveVisit}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator color={colors.white} size="small" />
                                        ) : (
                                            <Text style={styles.modalSaveText}>
                                                {editingVisits.length > 1 ? '일괄 저장' : '저장'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
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
    batchEditButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: 'rgba(33, 150, 243, 0.15)',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(33, 150, 243, 0.3)',
    },
    batchEditButtonText: {
        fontSize: fontSize.base,
        color: '#2196F3',
        fontWeight: fontWeight.medium,
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

    // 복약 목록
    logsList: {
        gap: spacing.md,
    },
    logItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    logStatus: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    logStatusTaken: {
        backgroundColor: colors.primary,
    },
    logStatusMissed: {
        backgroundColor: colors.danger,
    },
    logStatusPending: {
        backgroundColor: colors.textLight,
    },
    logInfo: {
        flex: 1,
    },
    logName: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        color: colors.text,
    },
    logTime: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginTop: 2,
    },
    logStatusText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },
    logStatusTextTaken: {
        color: colors.primary,
    },
    logStatusTextMissed: {
        color: colors.danger,
    },

    // 수정 모달
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        backgroundColor: colors.base,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 400,
        ...shadows.dark,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    modalMedList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    modalMedName: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
    },
    modalBatchNote: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    modalField: {
        marginBottom: spacing.lg,
    },
    modalLabel: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    modalDateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.md,
    },
    modalDateText: {
        fontSize: fontSize.base,
        color: colors.text,
    },
    modalInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    modalInput: {
        flex: 1,
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: '#2196F3',
        padding: spacing.md,
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(33, 150, 243, 0.3)',
        textAlign: 'center',
    },
    modalInputUnit: {
        fontSize: fontSize.lg,
        color: colors.textSecondary,
    },
    modalPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderRadius: borderRadius.md,
        marginBottom: spacing.xl,
    },
    modalPreviewText: {
        fontSize: fontSize.base,
        color: '#2196F3',
        fontWeight: fontWeight.medium,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    modalCancelButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.baseLight,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },
    modalSaveButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: '#2196F3',
        alignItems: 'center',
    },
    modalSaveText: {
        fontSize: fontSize.base,
        color: colors.white,
        fontWeight: fontWeight.bold,
    },
    modalButtonDisabled: {
        opacity: 0.5,
    },
});
