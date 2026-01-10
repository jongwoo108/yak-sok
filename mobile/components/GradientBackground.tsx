/**
 * GradientBackground - 파스텔 그라디언트 배경 컴포넌트
 * 민트 → 그린 → 블루 톤의 부드러운 그라디언트
 */

import React from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBackgroundProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'mint' | 'aurora' | 'sunset' | 'ocean' | 'forest';
}

// 그라디언트 프리셋 - 더 다양한 색상 변화
const gradientPresets = {
    // 민트 오로라 (메인 - 민트에서 그린, 블루로)
    mint: {
        colors: [
            '#E8F5E9',  // 연한 그린
            '#E0F2F1',  // 민트
            '#E1F5FE',  // 연한 블루  
            '#E8EDF2',  // 뉴트럴
        ] as const,
        locations: [0, 0.35, 0.7, 1] as const,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
    },
    // 오로라 (민트 → 퍼플 → 블루)
    aurora: {
        colors: [
            '#E0F7FA',  // 사이안
            '#E8F5E9',  // 그린
            '#F3E5F5',  // 라벤더
            '#E8EDF2',  // 뉴트럴
        ] as const,
        locations: [0, 0.4, 0.75, 1] as const,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
    },
    // 선셋 (피치 → 핑크 → 라벤더)
    sunset: {
        colors: [
            '#FFF3E0',  // 연한 오렌지
            '#FCE4EC',  // 핑크
            '#F3E5F5',  // 라벤더
            '#E8EDF2',  // 뉴트럴
        ] as const,
        locations: [0, 0.4, 0.75, 1] as const,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
    },
    // 오션 (블루 → 사이안 → 민트)
    ocean: {
        colors: [
            '#E3F2FD',  // 블루
            '#E0F7FA',  // 사이안
            '#E0F2F1',  // 민트
            '#E8EDF2',  // 뉴트럴
        ] as const,
        locations: [0, 0.35, 0.7, 1] as const,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
    },
    // 포레스트 (그린 → 민트 → 블루그린)
    forest: {
        colors: [
            '#E8F5E9',  // 연한 그린
            '#E0F2F1',  // 민트
            '#B2DFDB',  // 그린민트
            '#E0F2F1',  // 민트
        ] as const,
        locations: [0, 0.3, 0.6, 1] as const,
        start: { x: 0.2, y: 0 },
        end: { x: 0.8, y: 1 },
    },
};

export function GradientBackground({
    children,
    style,
    variant = 'mint'
}: GradientBackgroundProps) {
    const preset = gradientPresets[variant];

    return (
        <LinearGradient
            colors={preset.colors}
            locations={preset.locations}
            start={preset.start}
            end={preset.end}
            style={[styles.container, style]}
        >
            {children}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default GradientBackground;
