/**
 * PremiumScreen - 프리미엄 구독 안내 페이지
 * 1단계: 기능 소개 + 문의/데모 요청 (IAP 연동 전)
 */

import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import { NeumorphCard } from '../components';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../components/theme';

const FEATURES = [
    {
        icon: 'sparkles',
        title: '오늘의 라이프스타일 팁',
        desc: '나의 복약 정보를 바탕으로 GPT가 매일 맞춤 건강 팁 4가지를 생성해드립니다.',
    },
    {
        icon: 'nutrition',
        title: '식이요법 가이드',
        desc: '복용 중인 약과 질환에 맞는 식단 조언을 받아보세요.',
    },
    {
        icon: 'fitness',
        title: '운동 & 수면 관리',
        desc: '건강 상태에 최적화된 운동 강도와 수면 루틴을 추천합니다.',
    },
    {
        icon: 'heart',
        title: '멘탈 헬스 케어',
        desc: '스트레스 관리와 정신 건강을 위한 일상 팁을 제공합니다.',
    },
];

export default function PremiumScreen() {
    const router = useRouter();

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* 타이틀 */}
                <View style={styles.heroSection}>
                    <View style={styles.badgeRow}>
                        <Ionicons name="sparkles" size={20} color={colors.lavenderDark} />
                        <Text style={styles.badgeText}>프리미엄</Text>
                    </View>
                    <Text style={styles.title}>더 건강한 일상을{'\n'}만들어드립니다</Text>
                    <Text style={styles.subtitle}>
                        나의 복약 정보를 기반으로{'\n'}AI가 매일 맞춤 건강 콘텐츠를 제공합니다
                    </Text>
                </View>

                {/* 기능 목록 */}
                <View style={styles.featuresSection}>
                    <Text style={styles.sectionTitle}>프리미엄 기능</Text>
                    {FEATURES.map((f, i) => (
                        <NeumorphCard key={i} style={styles.featureCard}>
                            <View style={styles.featureIcon}>
                                <Ionicons name={f.icon as any} size={22} color={colors.lavenderDark} />
                            </View>
                            <View style={styles.featureText}>
                                <Text style={styles.featureTitle}>{f.title}</Text>
                                <Text style={styles.featureDesc}>{f.desc}</Text>
                            </View>
                        </NeumorphCard>
                    ))}
                </View>

                {/* 준비 중 안내 */}
                <NeumorphCard style={styles.comingSoonCard}>
                    <Ionicons name="time-outline" size={28} color={colors.primary} />
                    <Text style={styles.comingSoonTitle}>구독 기능 준비 중</Text>
                    <Text style={styles.comingSoonDesc}>
                        App Store 인앱 결제 연동을 준비 중입니다.{'\n'}
                        출시 시 알림을 받으시려면 문의해주세요.
                    </Text>
                </NeumorphCard>

                <View style={{ height: 40 }} />
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 56 : 40,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.soft,
    },
    content: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxxl,
    },

    // 히어로
    heroSection: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.lavenderLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.pill,
        marginBottom: spacing.lg,
    },
    badgeText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.lavenderDark,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 36,
        marginBottom: spacing.md,
    },
    subtitle: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },

    // 기능 목록
    featuresSection: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.md,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.lavenderLight,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    featureDesc: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 21,
    },

    // 준비 중 카드
    comingSoonCard: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        gap: spacing.md,
    },
    comingSoonTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    comingSoonDesc: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
