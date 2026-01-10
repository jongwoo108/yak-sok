/**
 * ClayButton - 3D 뉴모피즘 버튼 컴포넌트
 * 웹의 .btn, .clay-btn-primary 스타일을 React Native로 구현
 */

import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
} from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight, shadows } from './theme';

interface ClayButtonProps {
    children: React.ReactNode;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export function ClayButton({
    children,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    style,
    textStyle,
    icon,
}: ClayButtonProps) {
    const getButtonStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            ...styles.button,
            ...getSizeStyle(),
        };

        switch (variant) {
            case 'primary':
                return {
                    ...baseStyle,
                    backgroundColor: colors.primary,
                    // Colored shadow for primary button
                    shadowColor: colors.primary,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 4,
                };
            case 'secondary':
                // Neumorphic Soft Button
                return {
                    ...baseStyle,
                    backgroundColor: colors.base, // Same as bg
                    // Emulate extruded look via shadows on the container (handled better if wrapper, but here inline)
                    // Note: Inline complex shadows on buttons is tricky. 
                    // For now, simpler shadow, or we wrap it like ClayCard if strictly needed.
                    // We'll use a strong single shadow here for simplicity in this component or just border.
                    borderWidth: 1,
                    borderColor: colors.white,
                    shadowColor: '#A3B1C6',
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                    elevation: 4,
                };
            case 'danger':
                return {
                    ...baseStyle,
                    backgroundColor: colors.danger,
                    shadowColor: colors.danger,
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                };
            case 'ghost':
                return {
                    ...baseStyle,
                    backgroundColor: 'transparent',
                };
            default:
                return baseStyle;
        }
    };

    const getTextStyle = (): TextStyle => {
        const baseTextStyle: TextStyle = {
            ...styles.text,
            ...getTextSizeStyle(),
        };

        switch (variant) {
            case 'primary':
            case 'danger':
                return { ...baseTextStyle, color: colors.white };
            case 'secondary':
            case 'ghost':
                return { ...baseTextStyle, color: colors.text };
            default:
                return baseTextStyle;
        }
    };

    const getSizeStyle = (): ViewStyle => {
        switch (size) {
            case 'sm':
                return { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg };
            case 'lg':
                return { paddingVertical: spacing.xl, paddingHorizontal: spacing.xxl };
            default:
                return { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl };
        }
    };

    const getTextSizeStyle = (): TextStyle => {
        switch (size) {
            case 'sm':
                return { fontSize: fontSize.sm };
            case 'lg':
                return { fontSize: fontSize.xl };
            default:
                return { fontSize: fontSize.lg };
        }
    };

    return (
        <TouchableOpacity
            style={[
                getButtonStyle(),
                (disabled || loading) && styles.disabled,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' || variant === 'danger' ? colors.white : colors.text}
                />
            ) : (
                <>
                    {icon}
                    <Text style={[getTextStyle(), textStyle]}>{children}</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderRadius: borderRadius.pill,
    },
    text: {
        fontWeight: fontWeight.bold,
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.5,
    },
});

export default ClayButton;
