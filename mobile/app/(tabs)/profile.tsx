/**
 * ProfileScreen - 뉴모피즘 + 파스텔 프로필 화면
 * Neumorphism + Pastel Design
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useMedicationStore } from '../../services/store';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';

// 뉴모피즘 카드 컴포넌트
const NeumorphCard = ({ children, style }: { children: React.ReactNode; style?: any }) => {
    // style 배열에서 alignItems, justifyContent 등의 스타일을 분리
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : (style || {});
    const { alignItems, justifyContent, paddingVertical, ...containerStyle } = flatStyle;
    const surfaceStyle = { alignItems, justifyContent, paddingVertical };

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

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout, isAuthenticated } = useMedicationStore();

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
                        await logout();
                        router.replace('/(auth)/login');
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
                    <View style={styles.headerIconCircle}>
                        <Ionicons name="settings" size={28} color={colors.lavenderDark} />
                    </View>
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
                                    name={user?.role === 'senior' ? 'person' : 'people'}
                                    size={12}
                                    color={colors.primaryDark}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={styles.roleText}>
                                    {user?.role === 'senior' ? '시니어' : '보호자'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </NeumorphCard>

                {/* 계정 메뉴 */}
                <NeumorphCard style={styles.cardSpacing}>
                    <Text style={styles.sectionTitle}>계정</Text>
                    <MenuItem
                        icon="person"
                        iconColor={colors.primary}
                        title="프로필 수정"
                    />
                    <MenuItem
                        icon="notifications"
                        iconColor={colors.peachDark}
                        title="알림 설정"
                    />
                    <MenuItem
                        icon="call"
                        iconColor={colors.blueDark}
                        title="비상 연락처"
                    />
                </NeumorphCard>

                {/* 정보 메뉴 */}
                <NeumorphCard style={styles.cardSpacing}>
                    <Text style={styles.sectionTitle}>정보</Text>
                    <MenuItem
                        icon="document-text"
                        iconColor={colors.textSecondary}
                        title="이용약관"
                    />
                    <MenuItem
                        icon="shield-checkmark"
                        iconColor={colors.textSecondary}
                        title="개인정보 처리방침"
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
                {isAuthenticated && (
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out-outline" size={20} color={colors.dangerDark} />
                        <Text style={styles.logoutText}>로그아웃</Text>
                    </TouchableOpacity>
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
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
    },
    cardSpacing: {
        marginBottom: spacing.xl,
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
