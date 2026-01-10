/**
 * ClayCard - 뉴모피즘 카드 컴포넌트
 * Updated for True 3D Neumorphism (Dual Shadows)
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, shadows } from './theme';

interface ClayCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'default' | 'mint' | 'glass' | 'flat';
}

export function ClayCard({ children, style, variant = 'default' }: ClayCardProps) {
    const getBackgroundColor = () => {
        switch (variant) {
            case 'mint':
                return colors.mintLight; // Or gradient potentially
            case 'glass':
                return 'rgba(255, 255, 255, 0.7)';
            case 'flat':
                return 'transparent';
            default:
                return colors.base; // Matches background for Neumorphism
        }
    };

    if (variant === 'glass') {
        // Glassmorphism logic if needed, simpler for now
        return (
            <View style={[styles.card, { backgroundColor: getBackgroundColor() }, style]}>
                {children}
            </View>
        );
    }

    if (variant === 'flat') {
        return (
            <View style={[styles.card, { backgroundColor: 'transparent', borderWidth: 0 }, style]}>
                {children}
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            {/* Dark Shadow Layer (Bottom Right) */}
            <View style={[styles.shadowLayer, shadows.dark, { borderRadius: borderRadius.xxxl }]} />

            {/* Light Shadow Layer (Top Left) */}
            <View style={[styles.shadowLayer, shadows.light, { borderRadius: borderRadius.xxxl }]} />

            {/* Main Surface */}
            <View style={[
                styles.surface,
                { backgroundColor: getBackgroundColor() }
            ]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        margin: spacing.sm, // Ensure space for shadows
    },
    shadowLayer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base, // Needs a bg to cast shadow
        borderRadius: borderRadius.xxxl,
    },
    surface: {
        borderRadius: borderRadius.xxxl,
        padding: spacing.xl,
        // No shadow on surface itself, handled by layers
    },
    card: {
        borderRadius: borderRadius.xxxl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
});

export default ClayCard;
