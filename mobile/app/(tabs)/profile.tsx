/**
 * ProfileScreen - 뉴모피즘 + 파스텔 프로필 화면
 * Neumorphism + Pastel Design
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, ActivityIndicator, TextInput, Share, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useMedicationStore } from '../../services/store';
import { api } from '../../services/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard, NeumorphIconButton } from '../../components';
import type { GuardianRelation } from '../../services/types';


// 메뉴 아이템
const MenuItem = ({
    icon,
    iconColor = colors.primary,
    title,
    value,
    onPress,
    showArrow = true
}: {
    icon: string;
    iconColor?: string;
    title: string;
    value?: string;
    onPress?: () => void;
    showArrow?: boolean;
}) => (
    <TouchableOpacity
        style={styles.menuItem}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
    >
        <View style={[styles.menuIconCircle, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text style={styles.menuText}>{title}</Text>
        {value ? (
            <Text style={styles.menuValue}>{value}</Text>
        ) : showArrow && (
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        )}
    </TouchableOpacity>
);

// 알림 타입 옵션
const MESSAGE_OPTIONS = {
    guardian: [  // 보호자가 시니어에게
        { type: 'check_in', label: '안부 확인', icon: 'heart-outline', color: colors.peachDark },
        { type: 'reminder', label: '약 드셨나요?', icon: 'medical-outline', color: colors.primary },
    ],
    senior: [  // 시니어가 보호자에게
        { type: 'im_ok', label: '괜찮아요', icon: 'checkmark-circle-outline', color: colors.primary },
        { type: 'need_help', label: '도움 필요해요', icon: 'alert-circle-outline', color: colors.danger },
    ],
} as const;

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout, isAuthenticated } = useMedicationStore();
    
    // 연결된 사용자 목록
    const [connectedUsers, setConnectedUsers] = useState<Array<{ id: number; name: string; role: string; relationId: number }>>([]);
    const [loadingConnections, setLoadingConnections] = useState(false);
    
    // 알림 전송 모달
    const [alertModalVisible, setAlertModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
    const [sendingAlert, setSendingAlert] = useState(false);
    
    // 연결 관리 모달
    const [connectModalVisible, setConnectModalVisible] = useState(false);
    const [myInviteCode, setMyInviteCode] = useState<string | null>(null);
    const [inputCode, setInputCode] = useState('');
    const [generatingCode, setGeneratingCode] = useState(false);
    const [acceptingCode, setAcceptingCode] = useState(false);

    // 연결된 사용자 목록 가져오기
    const fetchConnections = useCallback(async () => {
        if (!user) return;
        setLoadingConnections(true);
        try {
            const res = await api.guardians.list();
            const relations = res.data.results || res.data || [];
            
            // 현재 사용자 역할에 따라 연결된 사용자 추출
            const users = relations.map((rel: GuardianRelation) => {
                if (user.role === 'senior') {
                    return { id: rel.guardian, name: rel.guardian_name, role: 'guardian', relationId: rel.id };
                } else {
                    return { id: rel.senior, name: rel.senior_name, role: 'senior', relationId: rel.id };
                }
            });
            setConnectedUsers(users);
        } catch (error) {
            console.error('Fetch connections error:', error);
        } finally {
            setLoadingConnections(false);
        }
    }, [user]);

    // 화면 포커스 시 연결 목록 새로고침
    useFocusEffect(
        useCallback(() => {
            fetchConnections();
        }, [fetchConnections])
    );
    
    // 내 초대 코드 조회
    const fetchMyInviteCode = async () => {
        try {
            const res = await api.invite.get();
            setMyInviteCode(res.data.code);
        } catch (error) {
            console.error('Fetch invite code error:', error);
        }
    };
    
    // 초대 코드 생성
    const handleGenerateCode = async () => {
        setGeneratingCode(true);
        try {
            const res = await api.invite.generate();
            if (res.data.success) {
                setMyInviteCode(res.data.invite.code);
                Alert.alert('성공', res.data.message);
            }
        } catch (error: any) {
            Alert.alert('오류', error.response?.data?.error || '코드 생성에 실패했습니다.');
        } finally {
            setGeneratingCode(false);
        }
    };
    
    // 초대 코드 공유
    const handleShareCode = async () => {
        if (!myInviteCode) return;
        try {
            await Share.share({
                message: `약속 앱에서 저와 연결해주세요! 초대 코드: ${myInviteCode}`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };
    
    // 초대 코드 수락
    const handleAcceptCode = async () => {
        if (inputCode.length !== 6) {
            Alert.alert('오류', '6자리 초대 코드를 입력해주세요.');
            return;
        }
        
        setAcceptingCode(true);
        try {
            const res = await api.invite.accept(inputCode);
            if (res.data.success) {
                Alert.alert('연결 완료', res.data.message);
                setInputCode('');
                setConnectModalVisible(false);
                fetchConnections();  // 연결 목록 새로고침
            }
        } catch (error: any) {
            Alert.alert('오류', error.response?.data?.error || '연결에 실패했습니다.');
        } finally {
            setAcceptingCode(false);
        }
    };
    
    // 연결 해제
    const handleDisconnect = (relationId: number, userName: string) => {
        Alert.alert(
            '연결 해제',
            `${userName}님과의 연결을 해제하시겠습니까?`,
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '해제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.guardians.delete(relationId);
                            fetchConnections();
                            Alert.alert('완료', '연결이 해제되었습니다.');
                        } catch (error) {
                            Alert.alert('오류', '연결 해제에 실패했습니다.');
                        }
                    },
                },
            ]
        );
    };
    
    // 연결 관리 모달 열기
    const openConnectModal = () => {
        fetchMyInviteCode();
        setConnectModalVisible(true);
    };

    // 알림 전송
    const handleSendAlert = async (messageType: string) => {
        if (!selectedUser) return;
        
        setSendingAlert(true);
        try {
            const res = await api.alerts.send({
                recipient_id: selectedUser.id,
                message_type: messageType as any,
            });
            setAlertModalVisible(false);
            Alert.alert('전송 완료', res.data.message);
        } catch (error: any) {
            console.error('Send alert error:', error);
            Alert.alert('전송 실패', error.response?.data?.error || '알림 전송에 실패했습니다.');
        } finally {
            setSendingAlert(false);
        }
    };

    // 알림 보내기 모달 열기
    const openAlertModal = (targetUser: { id: number; name: string }) => {
        setSelectedUser(targetUser);
        setAlertModalVisible(true);
    };

    const handleLogout = () => {
        Alert.alert(
            '로그아웃',
            '정말 로그아웃 하시겠습니까?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '로그아웃',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                            // 직접 로그인 페이지로 이동
                            router.replace('/(auth)/login');
                        } catch (error) {
                            console.error('Logout error:', error);
                        }
                    },
                },
            ]
        );
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
                        <Ionicons name="settings" size={28} color={colors.primary} />
                    </NeumorphIconButton>
                    <Text style={styles.headerTitle}>설정</Text>
                </View>

                {/* 프로필 카드 */}
                <NeumorphCard style={styles.cardSpacing}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.first_name?.[0] || user?.username?.[0] || '?'}
                            </Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>
                                {user?.first_name || user?.username || '사용자'}
                            </Text>
                            <Text style={styles.profileEmail}>{user?.email || '-'}</Text>
                            <View style={styles.roleBadge}>
                                <Ionicons
                                    name={user?.role === 'guardian' ? 'people' : user?.role === 'senior' ? 'person' : 'medical'}
                                    size={12}
                                    color={colors.primaryDark}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={styles.roleText}>
                                    {user?.role === 'patient' ? '복약자' : user?.role === 'senior' ? '시니어' : '보호자'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </NeumorphCard>

                {/* 연결 관리 - 모든 역할 표시 (복약자/시니어는 보호자와, 보호자는 시니어와 연결) */}
                {(
                    <NeumorphCard style={styles.cardSpacing}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>연결 관리</Text>
                            <TouchableOpacity onPress={openConnectModal} activeOpacity={0.7}>
                                <View style={styles.addConnectionButton}>
                                    <Ionicons name="add" size={18} color={colors.white} />
                                    <Text style={styles.addConnectionText}>연결 추가</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                        
                        {loadingConnections ? (
                            <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
                        ) : connectedUsers.length === 0 ? (
                            <View style={styles.emptyConnection}>
                                <Ionicons name="people-outline" size={40} color={colors.textLight} />
                                <Text style={styles.emptyConnectionText}>연결된 사용자가 없습니다</Text>
                                <Text style={styles.emptyConnectionHint}>
                                    {user?.role === 'guardian' ? '시니어/복약자와 연결하여 복약을 관리하세요' : '보호자와 연결하여 복약 관리를 받으세요'}
                                </Text>
                            </View>
                        ) : (
                            connectedUsers.map((connUser) => (
                                <View key={connUser.id} style={styles.connectedUserItem}>
                                    <TouchableOpacity
                                        style={styles.connectedUserMain}
                                        onPress={() => openAlertModal(connUser)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.connectedUserAvatar}>
                                            <Text style={styles.connectedUserAvatarText}>
                                                {connUser.name?.[0] || '?'}
                                            </Text>
                                        </View>
                                        <View style={styles.connectedUserInfo}>
                                            <Text style={styles.connectedUserName}>{connUser.name}</Text>
                                            <Text style={styles.connectedUserHint}>탭하여 알림 보내기</Text>
                                        </View>
                                        <Ionicons name="send" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.disconnectButton}
                                        onPress={() => handleDisconnect(connUser.relationId, connUser.name)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="close-circle" size={22} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </NeumorphCard>
                )}

                {/* 계정 메뉴 */}
                <NeumorphCard style={styles.cardSpacing}>
                    <Text style={styles.sectionTitle}>계정</Text>
                    <MenuItem
                        icon="person"
                        iconColor={colors.primary}
                        title="프로필 수정"
                        onPress={() => router.push('/profile/edit')}
                    />
                    <MenuItem
                        icon="notifications"
                        iconColor={colors.peachDark}
                        title="알림 설정"
                        onPress={() => router.push('/profile/notifications')}
                    />
                    <MenuItem
                        icon="call"
                        iconColor={colors.blueDark}
                        title="비상 연락처"
                        onPress={() => router.push('/profile/emergency')}
                    />
                </NeumorphCard>

                {/* 정보 메뉴 */}
                <NeumorphCard style={styles.cardSpacing}>
                    <Text style={styles.sectionTitle}>정보</Text>
                    <MenuItem
                        icon="document-text"
                        iconColor={colors.textSecondary}
                        title="이용약관"
                        onPress={() => {
                            const url = 'https://yaksok-care.com/api/users/terms/';
                            if (Platform.OS === 'web') {
                                window.open(url, '_blank');
                            } else {
                                Linking.openURL(url);
                            }
                        }}
                    />
                    <MenuItem
                        icon="shield-checkmark"
                        iconColor={colors.textSecondary}
                        title="개인정보 처리방침"
                        onPress={() => {
                            const url = 'https://yaksok-care.com/api/users/privacy/';
                            if (Platform.OS === 'web') {
                                window.open(url, '_blank');
                            } else {
                                Linking.openURL(url);
                            }
                        }}
                    />
                    <MenuItem
                        icon="phone-portrait"
                        iconColor={colors.textSecondary}
                        title="앱 버전"
                        value="1.0.0"
                        showArrow={false}
                    />
                </NeumorphCard>

                {/* 로그아웃 버튼 */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={20} color={colors.dangerDark} />
                    <Text style={styles.logoutText}>로그아웃</Text>
                </TouchableOpacity>

                {/* 하단 여백 */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* 알림 전송 모달 */}
            <Modal
                visible={alertModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setAlertModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Ionicons name="send" size={24} color={colors.primary} />
                            <Text style={styles.modalTitle}>알림 보내기</Text>
                        </View>
                        
                        {selectedUser && (
                            <Text style={styles.modalRecipient}>
                                {selectedUser.name}님에게
                            </Text>
                        )}

                        {/* 메시지 옵션 버튼들 */}
                        <View style={styles.alertOptionsContainer}>
                            {(user?.role === 'guardian' ? MESSAGE_OPTIONS.guardian : MESSAGE_OPTIONS.senior).map((option) => (
                                <TouchableOpacity
                                    key={option.type}
                                    style={[styles.alertOptionButton, sendingAlert && styles.alertOptionDisabled]}
                                    onPress={() => handleSendAlert(option.type)}
                                    disabled={sendingAlert}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.alertOptionIcon, { backgroundColor: `${option.color}20` }]}>
                                        <Ionicons name={option.icon as any} size={28} color={option.color} />
                                    </View>
                                    <Text style={styles.alertOptionLabel}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {sendingAlert && (
                            <View style={styles.sendingIndicator}>
                                <ActivityIndicator color={colors.primary} />
                                <Text style={styles.sendingText}>전송 중...</Text>
                            </View>
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

            {/* 연결 관리 모달 */}
            <Modal
                visible={connectModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setConnectModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Ionicons name="people" size={24} color={colors.primary} />
                            <Text style={styles.modalTitle}>사용자 연결</Text>
                        </View>

                        {/* 내 초대 코드 */}
                        <View style={styles.inviteSection}>
                            <Text style={styles.inviteSectionTitle}>내 초대 코드</Text>
                            <Text style={styles.inviteSectionHint}>
                                상대방에게 이 코드를 전달하세요
                            </Text>
                            
                            {myInviteCode ? (
                                <View style={styles.inviteCodeBox}>
                                    <Text style={styles.inviteCodeText}>{myInviteCode}</Text>
                                    <TouchableOpacity onPress={handleShareCode} style={styles.shareButton}>
                                        <Ionicons name="share-outline" size={22} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.generateButton}
                                    onPress={handleGenerateCode}
                                    disabled={generatingCode}
                                >
                                    {generatingCode ? (
                                        <ActivityIndicator color={colors.white} size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="add-circle" size={20} color={colors.white} />
                                            <Text style={styles.generateButtonText}>코드 생성하기</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* 구분선 */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>또는</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* 상대방 코드 입력 */}
                        <View style={styles.inviteSection}>
                            <Text style={styles.inviteSectionTitle}>초대 코드 입력</Text>
                            <Text style={styles.inviteSectionHint}>
                                상대방에게 받은 6자리 코드를 입력하세요
                            </Text>
                            
                            <View style={styles.codeInputContainer}>
                                <TextInput
                                    style={styles.codeInput}
                                    value={inputCode}
                                    onChangeText={(text) => setInputCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    placeholderTextColor={colors.textLight}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                                <TouchableOpacity
                                    style={[styles.acceptButton, inputCode.length !== 6 && styles.acceptButtonDisabled]}
                                    onPress={handleAcceptCode}
                                    disabled={inputCode.length !== 6 || acceptingCode}
                                >
                                    {acceptingCode ? (
                                        <ActivityIndicator color={colors.white} size="small" />
                                    ) : (
                                        <Text style={styles.acceptButtonText}>연결</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setConnectModalVisible(false)}
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
    },

    // 헤더
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    headerIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.lavenderLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },

    cardSpacing: {
        marginBottom: spacing.xl,
    },

    headerIconBtn: {
        marginBottom: spacing.lg,
    },

    // 프로필
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.lg,
        ...shadows.mint,
    },
    avatarText: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    profileEmail: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.mintLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.pill,
        alignSelf: 'flex-start',
        marginTop: spacing.sm,
    },
    roleText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: colors.primaryDark,
    },

    // 메뉴
    sectionTitle: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(184, 196, 206, 0.2)',
    },
    menuIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    menuText: {
        flex: 1,
        fontSize: fontSize.base,
        color: colors.text,
        fontWeight: fontWeight.medium,
    },
    menuValue: {
        fontSize: fontSize.sm,
        color: colors.textLight,
    },

    // 연결 관리 섹션
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    addConnectionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.pill,
        gap: spacing.xs,
    },
    addConnectionText: {
        fontSize: fontSize.sm,
        color: colors.white,
        fontWeight: fontWeight.medium,
    },
    emptyConnection: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyConnectionText: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    emptyConnectionHint: {
        fontSize: fontSize.sm,
        color: colors.textLight,
        marginTop: spacing.xs,
        textAlign: 'center',
    },

    // 연결된 사용자
    connectedUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(184, 196, 206, 0.2)',
    },
    connectedUserMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    connectedUserAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.blueDark,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    connectedUserAvatarText: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
    connectedUserInfo: {
        flex: 1,
    },
    connectedUserName: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    connectedUserHint: {
        fontSize: fontSize.xs,
        color: colors.textLight,
        marginTop: 2,
    },
    disconnectButton: {
        padding: spacing.sm,
        marginLeft: spacing.sm,
    },

    // 연결 관리 모달
    inviteSection: {
        marginBottom: spacing.lg,
    },
    inviteSectionTitle: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    inviteSectionHint: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    inviteCodeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.mintLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    inviteCodeText: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.primaryDark,
        letterSpacing: 8,
    },
    shareButton: {
        padding: spacing.sm,
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        gap: spacing.sm,
    },
    generateButtonText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.white,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.textLight,
        opacity: 0.3,
    },
    dividerText: {
        marginHorizontal: spacing.lg,
        fontSize: fontSize.sm,
        color: colors.textLight,
    },
    codeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    codeInput: {
        flex: 1,
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        textAlign: 'center',
        letterSpacing: 6,
    },
    acceptButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    acceptButtonDisabled: {
        backgroundColor: colors.textLight,
    },
    acceptButtonText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },

    // 알림 전송 모달
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
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    modalTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    modalRecipient: {
        fontSize: fontSize.base,
        color: colors.primary,
        fontWeight: fontWeight.semibold,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    alertOptionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    alertOptionButton: {
        width: '45%',
        backgroundColor: colors.baseLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
    },
    alertOptionDisabled: {
        opacity: 0.5,
    },
    alertOptionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    alertOptionLabel: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.text,
        textAlign: 'center',
    },
    sendingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    sendingText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    modalCloseButton: {
        padding: spacing.md,
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },

    // 로그아웃
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.base,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.lg,
        gap: spacing.sm,
        borderWidth: 2,
        borderColor: colors.danger,
    },
    logoutText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.dangerDark,
    },
});
