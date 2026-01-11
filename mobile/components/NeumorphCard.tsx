
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, shadows } from './theme';

interface NeumorphCardProps {
    children: React.ReactNode;
    style?: any;
    variant?: 'default' | 'inset';
}

export function NeumorphCard({ children, style, variant = 'default' }: NeumorphCardProps) {
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : (style || {});
    // Extract layout props that should apply to the inner surface content, not the container
    const { alignItems, justifyContent, paddingVertical, paddingHorizontal, padding, ...containerStyle } = flatStyle;

    // Explicitly handle padding for the surface
    const surfaceStyle: any = { alignItems, justifyContent };
    if (padding !== undefined) surfaceStyle.padding = padding;
    if (paddingVertical !== undefined) surfaceStyle.paddingVertical = paddingVertical;
    if (paddingHorizontal !== undefined) surfaceStyle.paddingHorizontal = paddingHorizontal;

    if (variant === 'inset') {
        return (
            <View style={[styles.insetCard, style]}>
                {children}
            </View>
        );
    }

    return (
        <View style={[styles.container, containerStyle]}>
            <View style={[styles.shadowDark, { borderRadius: borderRadius.xxl }]} />
            <View style={[styles.shadowLight, { borderRadius: borderRadius.xxl }]} />
            <View style={[styles.cardSurface, surfaceStyle]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
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
        borderRadius: borderRadius.xxl,
        padding: spacing.xl,
    },
    insetCard: {
        backgroundColor: colors.base,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 2,
        borderTopColor: 'rgba(184, 196, 206, 0.4)',
        borderLeftColor: 'rgba(184, 196, 206, 0.4)',
        borderBottomColor: 'rgba(255, 255, 255, 0.8)',
        borderRightColor: 'rgba(255, 255, 255, 0.8)',
    },
});
