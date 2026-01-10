/**
 * OrganicBackground - 유기적 그라데이션 배경 컴포넌트
 * 웹의 .organic-bg 스타일을 React Native로 구현
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { colors } from './theme';

const { width, height } = Dimensions.get('window');

interface OrganicBackgroundProps {
    children?: React.ReactNode;
}

export function OrganicBackground({ children }: OrganicBackgroundProps) {
    return (
        <View style={styles.container}>
            {/* 배경 레이어들 */}
            <View style={[styles.gradientCircle, styles.topLeft]} />
            <View style={[styles.gradientCircle, styles.topRight]} />
            <View style={[styles.gradientCircle, styles.bottomCenter]} />

            {/* 기본 배경색 */}
            <View style={styles.baseBackground} />

            {/* 자식 컴포넌트 */}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.creamLight,
    },
    baseBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.creamLight,
        zIndex: -2,
    },
    gradientCircle: {
        position: 'absolute',
        borderRadius: 999,
        zIndex: -1,
    },
    topLeft: {
        width: width * 0.8,
        height: width * 0.8,
        backgroundColor: colors.mintLight,
        opacity: 0.4,
        top: -width * 0.3,
        left: -width * 0.2,
    },
    topRight: {
        width: width * 0.6,
        height: width * 0.6,
        backgroundColor: colors.blueLight,
        opacity: 0.3,
        top: -width * 0.1,
        right: -width * 0.2,
    },
    bottomCenter: {
        width: width * 0.7,
        height: width * 0.7,
        backgroundColor: colors.pinkLight,
        opacity: 0.3,
        bottom: -width * 0.2,
        left: '15%',
    },
});

export default OrganicBackground;
