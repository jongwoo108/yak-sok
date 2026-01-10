/**
 * ClayInput - 뉴모피즘 입력 필드 컴포넌트
 * 웹의 .clay-input 스타일을 React Native로 구현
 */

import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight } from './theme';

interface ClayInputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export function ClayInput({
    label,
    error,
    containerStyle,
    style,
    ...props
}: ClayInputProps) {
    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    error && styles.inputError,
                    style,
                ]}
                placeholderTextColor={colors.textLight}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.xl,
    },
    label: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.md,
        marginLeft: spacing.sm,
    },
    input: {
        width: '100%',
        padding: spacing.lg,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.base, // Same as bg
        fontSize: fontSize.lg,
        color: colors.text,

        // Simulating Inset Shadow (Sunken Effect)
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderRightWidth: 1,
        borderBottomWidth: 1,

        borderTopColor: 'rgba(163, 177, 198, 0.3)', // Darker top/left
        borderLeftColor: 'rgba(163, 177, 198, 0.3)',
        borderRightColor: 'rgba(255, 255, 255, 0.7)', // Lighter bottom/right
        borderBottomColor: 'rgba(255, 255, 255, 0.7)',
    },
    inputError: {
        borderColor: colors.danger,
        borderWidth: 2,
    },
    errorText: {
        fontSize: fontSize.sm,
        color: colors.danger,
        marginTop: spacing.sm,
        marginLeft: spacing.sm,
    },
});

export default ClayInput;
