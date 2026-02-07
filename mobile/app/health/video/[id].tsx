/**
 * VideoDetailScreen - 영상 상세 + YouTube 임베드 재생
 */

import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    Platform,
    Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { api } from '../../../services/api';
import type { CachedVideo } from '../../../services/types';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../../components/theme';
import { GradientBackground } from '../../../components/GradientBackground';
import { NeumorphCard } from '../../../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLAYER_HEIGHT = (SCREEN_WIDTH - spacing.xl * 2) * (9 / 16);

export default function VideoDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [video, setVideo] = useState<CachedVideo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarkId, setBookmarkId] = useState<number | null>(null);
    const [playing, setPlaying] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        loadVideo();
    }, [id]);

    const loadVideo = async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            setLoadError(false);
            const res = await api.health.getVideo(Number(id));
            setVideo(res.data);
            setIsBookmarked(res.data.is_bookmarked);
        } catch (error) {
            console.error('[VideoDetail] 영상 로드 실패:', error);
            setLoadError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleBookmark = async () => {
        if (!video) return;
        try {
            if (isBookmarked && bookmarkId) {
                await api.health.removeBookmark(bookmarkId);
                setIsBookmarked(false);
                setBookmarkId(null);
            } else {
                const res = await api.health.addBookmark(video.id);
                setIsBookmarked(true);
                setBookmarkId(res.data.id);
            }
        } catch (error) {
            console.error('[VideoDetail] 북마크 실패:', error);
        }
    };

    const openInYouTube = () => {
        if (!video) return;
        Linking.openURL(`https://www.youtube.com/watch?v=${video.video_id}`);
    };

    const formatViewCount = (count: number) => {
        if (count >= 10000) return `조회수 ${Math.floor(count / 10000)}만회`;
        if (count >= 1000) return `조회수 ${Math.floor(count / 1000)}천회`;
        return `조회수 ${count}회`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
    };

    const onStateChange = useCallback((state: string) => {
        if (state === 'ended') {
            setPlaying(false);
        }
    }, []);

    if (isLoading) {
        return (
            <GradientBackground variant="ocean" style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </GradientBackground>
        );
    }

    if (loadError || !video) {
        return (
            <GradientBackground variant="ocean" style={styles.container}>
                <View style={styles.loadingContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <View style={styles.backButtonInner}>
                            <Ionicons name="chevron-back" size={22} color={colors.text} />
                        </View>
                    </TouchableOpacity>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.textLight} />
                    <Text style={{ color: colors.textSecondary, marginTop: spacing.md, fontSize: fontSize.base }}>
                        영상을 불러올 수 없습니다
                    </Text>
                    <TouchableOpacity onPress={loadVideo} style={{ marginTop: spacing.md }}>
                        <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>다시 시도</Text>
                    </TouchableOpacity>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground variant="ocean" style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* 뒤로가기 */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <View style={styles.backButtonInner}>
                        <Ionicons name="chevron-back" size={22} color={colors.text} />
                    </View>
                </TouchableOpacity>

                {/* YouTube Player */}
                <View style={styles.playerContainer}>
                    <YoutubePlayer
                        height={PLAYER_HEIGHT}
                        play={playing}
                        videoId={video.video_id}
                        onChangeState={onStateChange}
                        webViewProps={{
                            androidLayerType: 'hardware',
                        }}
                    />
                </View>

                {/* 영상 정보 */}
                <NeumorphCard style={styles.infoCard}>
                    <Text style={styles.videoTitle}>{video.title}</Text>
                    
                    <View style={styles.metaRow}>
                        <Text style={styles.channelName}>{video.channel_title}</Text>
                        {video.is_from_trusted_channel && (
                            <View style={styles.trustedBadge}>
                                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                                <Text style={styles.trustedText}>신뢰 채널</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.statsRow}>
                        <Text style={styles.statsText}>{formatViewCount(video.view_count)}</Text>
                        <Text style={styles.statsDot}> | </Text>
                        <Text style={styles.statsText}>{formatDate(video.published_at)}</Text>
                    </View>

                    {/* 질병 태그 */}
                    {video.conditions && video.conditions.length > 0 && (
                        <View style={styles.conditionTags}>
                            {video.conditions.map((condition) => (
                                <View key={condition.id} style={styles.conditionTag}>
                                    <Text style={styles.conditionTagText}>{condition.name}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </NeumorphCard>

                {/* 액션 버튼 */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={toggleBookmark}>
                        <Ionicons
                            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                            size={22}
                            color={isBookmarked ? colors.primary : colors.textSecondary}
                        />
                        <Text style={[styles.actionText, isBookmarked && { color: colors.primary }]}>
                            {isBookmarked ? '저장됨' : '저장'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={openInYouTube}>
                        <Ionicons name="logo-youtube" size={22} color="#FF0000" />
                        <Text style={styles.actionText}>YouTube에서 보기</Text>
                    </TouchableOpacity>
                </View>

                {/* 영상 설명 */}
                {video.description ? (
                    <NeumorphCard style={styles.descriptionCard}>
                        <Text style={styles.descriptionTitle}>영상 설명</Text>
                        <Text style={styles.descriptionText}>{video.description}</Text>
                    </NeumorphCard>
                ) : null}

                {/* 면책 조항 */}
                <View style={styles.disclaimer}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.textLight} />
                    <Text style={styles.disclaimerText}>
                        이 영상은 의료 전문가의 진단이나 치료를 대체하지 않습니다.
                    </Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // 뒤로가기
    backButton: {
        marginBottom: spacing.lg,
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

    // 플레이어
    playerContainer: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginBottom: spacing.lg,
    },

    // 영상 정보
    infoCard: {
        marginBottom: spacing.md,
    },
    videoTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
        lineHeight: 24,
        marginBottom: spacing.md,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    channelName: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
    },
    trustedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: spacing.sm,
        gap: 2,
    },
    trustedText: {
        fontSize: fontSize.xs,
        color: colors.primary,
        fontWeight: fontWeight.medium,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    statsText: {
        fontSize: fontSize.sm,
        color: colors.textLight,
    },
    statsDot: {
        fontSize: fontSize.sm,
        color: colors.textLight,
    },
    conditionTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    conditionTag: {
        backgroundColor: colors.mintLight,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.pill,
    },
    conditionTagText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: colors.primaryDark,
    },

    // 액션 버튼
    actionRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.base,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.soft,
    },
    actionText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
    },

    // 영상 설명
    descriptionCard: {
        marginBottom: spacing.lg,
    },
    descriptionTitle: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    descriptionText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 20,
    },

    // 면책 조항
    disclaimer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
    },
    disclaimerText: {
        fontSize: fontSize.xs,
        color: colors.textLight,
        flex: 1,
        lineHeight: 16,
    },
});
