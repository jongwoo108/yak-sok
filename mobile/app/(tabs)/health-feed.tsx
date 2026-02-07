/**
 * HealthFeedScreen - 건강 유튜브 피드
 * 사용자 질병 기반 맞춤 영상 추천
 */

import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
    Dimensions,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import type { CachedVideo, HealthProfile } from '../../services/types';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../components/theme';
import { GradientBackground } from '../../components/GradientBackground';
import { NeumorphCard } from '../../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;

// 이모지 제거 유틸
const removeEmojis = (text: string) =>
    text.replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();

const CATEGORIES = [
    { key: 'all', label: '전체', icon: 'apps' },
    { key: 'diet', label: '식이요법', icon: 'restaurant' },
    { key: 'exercise', label: '운동', icon: 'fitness' },
    { key: 'lifestyle', label: '생활습관', icon: 'sunny' },
    { key: 'medical', label: '전문의', icon: 'medkit' },
];

export default function HealthFeedScreen() {
    const router = useRouter();
    const [videos, setVideos] = useState<CachedVideo[]>([]);
    const [profile, setProfile] = useState<HealthProfile | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // 프로필 & 피드 로드
    const loadData = useCallback(async (reset = true) => {
        try {
            if (reset) {
                setIsLoading(true);
                setPage(1);
            }

            // 프로필 로드
            try {
                const profileRes = await api.health.getProfile();
                setProfile(profileRes.data);
            } catch (e) {
                // 프로필 없을 수 있음
            }

            // 피드 로드
            const params: { category?: string; page?: number } = {};
            if (selectedCategory !== 'all') params.category = selectedCategory;
            params.page = 1;

            const feedRes = await api.health.getFeed(params);
            const feedData = feedRes.data;
            const results = feedData.results || [];
            setVideos(results);
            setHasMore(!!feedData.next);
        } catch (error) {
            console.error('[HealthFeed] 데이터 로드 실패:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [selectedCategory]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [selectedCategory])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData(true);
    };

    // 무한 스크롤
    const loadMore = async () => {
        if (!hasMore || isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const nextPage = page + 1;
            const params: { category?: string; page?: number } = { page: nextPage };
            if (selectedCategory !== 'all') params.category = selectedCategory;

            const feedRes = await api.health.getFeed(params);
            const feedData = feedRes.data;
            const results = feedData.results || [];
            setVideos(prev => [...prev, ...results]);
            setHasMore(!!feedData.next);
            setPage(nextPage);
        } catch (error) {
            console.error('[HealthFeed] 추가 로드 실패:', error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // 프로필 분석 요청
    const handleRefreshProfile = async () => {
        try {
            await api.health.refreshProfile();
            // 잠시 후 프로필 새로 로드
            setTimeout(async () => {
                try {
                    const res = await api.health.getProfile();
                    setProfile(res.data);
                    loadData(true);
                } catch (e) { }
            }, 3000);
        } catch (error) {
            console.error('[HealthFeed] 프로필 분석 실패:', error);
        }
    };

    // 조회수 포맷
    const formatViewCount = (count: number) => {
        if (count >= 10000) return `${Math.floor(count / 10000)}만`;
        if (count >= 1000) return `${Math.floor(count / 1000)}천`;
        return String(count);
    };

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return '오늘';
        if (diffDays === 1) return '어제';
        if (diffDays < 7) return `${diffDays}일 전`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
        return `${Math.floor(diffDays / 365)}년 전`;
    };

    // 영상 카드 렌더
    const renderVideoCard = ({ item }: { item: CachedVideo }) => (
        <TouchableOpacity
            style={styles.videoCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/health/video/${item.id}` as any)}
        >
            <View style={styles.thumbnailContainer}>
                <Image
                    source={{ uri: item.thumbnail_url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
                {item.is_from_trusted_channel && (
                    <View style={styles.trustedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.white} />
                    </View>
                )}
                {item.content_category_display && (
                    <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{item.content_category_display}</Text>
                    </View>
                )}
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                    {removeEmojis(item.title)}
                </Text>
                <View style={styles.cardMeta}>
                    <Text style={styles.channelName} numberOfLines={1}>
                        {removeEmojis(item.channel_title)}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaText}>
                            {formatViewCount(item.view_count)}회
                        </Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Text style={styles.metaText}>
                            {formatDate(item.published_at)}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    // 헤더 컴포넌트
    const renderHeader = () => (
        <View>
            {/* 타이틀 */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>나의 건강 정보</Text>
            </View>

            {/* 건강 프로필 배지 */}
            {profile && profile.conditions && profile.conditions.length > 0 ? (
                <View style={styles.profileSection}>
                    <View style={styles.conditionBadges}>
                        {profile.conditions.map((condition, idx) => (
                            <View key={idx} style={styles.conditionBadge}>
                                <Text style={styles.conditionBadgeText}>{condition.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : (
                <TouchableOpacity onPress={handleRefreshProfile}>
                    <NeumorphCard style={styles.emptyProfile}>
                        <MaterialCommunityIcons name="stethoscope" size={24} color={colors.primary} />
                        <Text style={styles.emptyProfileText}>
                            등록된 약을 분석하여{'\n'}맞춤 건강 정보를 받아보세요
                        </Text>
                        <View style={styles.analyzeButton}>
                            <Text style={styles.analyzeButtonText}>분석하기</Text>
                        </View>
                    </NeumorphCard>
                </TouchableOpacity>
            )}

            {/* 카테고리 필터 */}
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={CATEGORIES}
                keyExtractor={(item) => item.key}
                style={styles.categoryList}
                contentContainerStyle={styles.categoryContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.categoryChip,
                            selectedCategory === item.key && styles.categoryChipActive,
                        ]}
                        onPress={() => setSelectedCategory(item.key)}
                    >
                        <Ionicons
                            name={item.icon as any}
                            size={14}
                            color={selectedCategory === item.key ? colors.white : colors.textSecondary}
                        />
                        <Text style={[
                            styles.categoryChipText,
                            selectedCategory === item.key && styles.categoryChipTextActive,
                        ]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    // 빈 상태
    const renderEmpty = () => {
        if (isLoading) return null;
        return (
            <NeumorphCard style={styles.emptyCard}>
                <Ionicons name="videocam-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyText}>
                    {profile?.conditions?.length
                        ? '아직 추천 영상이 없습니다\n잠시 후 다시 시도해주세요'
                        : '약을 등록하면 맞춤 건강 영상을\n추천받을 수 있습니다'}
                </Text>
            </NeumorphCard>
        );
    };

    // 푸터 (로딩 인디케이터)
    const renderFooter = () => {
        if (!isLoadingMore) return <View style={{ height: 120 }} />;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>건강 정보를 불러오는 중...</Text>
                </View>
            ) : (
                <FlatList
                    data={videos}
                    renderItem={renderVideoCard}
                    keyExtractor={(item) => String(item.id)}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={styles.flatListContent}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                />
            )}
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flatListContent: {
        padding: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
    },

    // 헤더
    header: {
        marginBottom: spacing.lg,
    },
    headerTitle: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },

    // 프로필 배지
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    conditionBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        flex: 1,
        gap: spacing.sm,
    },
    conditionBadge: {
        backgroundColor: colors.mintLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.pill,
    },
    conditionBadgeText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.primaryDark,
    },

    // 빈 프로필
    emptyProfile: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        marginBottom: spacing.lg,
    },
    emptyProfileText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.md,
        lineHeight: 20,
    },
    analyzeButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.pill,
        marginTop: spacing.md,
    },
    analyzeButtonText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        color: colors.white,
    },

    // 카테고리 필터
    categoryList: {
        marginBottom: spacing.lg,
    },
    categoryContent: {
        gap: spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.pill,
        backgroundColor: colors.base,
        gap: spacing.xs,
        ...shadows.soft,
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
    },
    categoryChipText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.textSecondary,
    },
    categoryChipTextActive: {
        color: colors.white,
    },

    // 영상 카드
    videoCard: {
        width: CARD_WIDTH,
        marginBottom: spacing.lg,
        backgroundColor: colors.base,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        ...shadows.soft,
    },
    thumbnailContainer: {
        width: '100%',
        height: CARD_WIDTH * 0.56,  // 16:9 비율
        backgroundColor: colors.baseDark,
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    trustedBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryTag: {
        position: 'absolute',
        bottom: spacing.sm,
        left: spacing.sm,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    categoryTagText: {
        fontSize: fontSize.xs,
        color: colors.white,
        fontWeight: fontWeight.medium,
    },
    cardContent: {
        padding: spacing.md,
    },
    videoTitle: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        lineHeight: 22,
        marginBottom: spacing.xs,
    },
    cardMeta: {
        gap: 2,
    },
    channelName: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: fontSize.xs,
        color: colors.textLight,
    },
    metaDot: {
        fontSize: fontSize.xs,
        color: colors.textLight,
        marginHorizontal: 4,
    },

    // 로딩
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
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
    emptyText: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.lg,
        lineHeight: 22,
    },

    // 푸터
    footerLoader: {
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
});
