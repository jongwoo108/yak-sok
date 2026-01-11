
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius, shadows } from './theme';

interface NeumorphIconButtonProps {
    children: React.ReactNode;
    style?: any;
    size?: number;
}

export function NeumorphIconButton({ children, style, size = 60 }: NeumorphIconButtonProps) {
    return (
        <View style={[styles.container, style, { width: size, height: size }]}>
            <View style={[styles.shadowDark, { borderRadius: size / 2 }]} />
            <View style={[styles.shadowLight, { borderRadius: size / 2 }]} />
            <View style={[styles.surface, { borderRadius: size / 2 }]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shadowDark: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        shadowColor: '#B8C4CE',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 6,
    },
    shadowLight: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.base,
        shadowColor: '#FFFFFF',
        shadowOffset: { width: -4, height: -4 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 0,
    },
    surface: {
        flex: 1,
        width: '100%',
        backgroundColor: colors.base,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
