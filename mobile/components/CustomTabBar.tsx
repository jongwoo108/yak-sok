/**
 * CustomTabBar - 커스텀 탭 바 컴포넌트
 * 레퍼런스 디자인처럼 좁고 중앙에 위치한 탭 바
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from './theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = SCREEN_WIDTH * 0.70; // 화면 너비의 70% (4탭 적용)

interface CustomTabBarProps {
    state: any;
    descriptors: any;
    navigation: any;
}

const icons: Record<string, string> = {
    index: 'home',
    calendar: 'calendar',
    medications: 'add-circle',
    profile: 'person',
};

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.tabBar}>
                {state.routes.map((route: any, index: number) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    const iconName = icons[route.name] || 'ellipse';

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabItem}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.iconContainer,
                                isFocused && styles.iconContainerFocused,
                            ]}>
                                <Ionicons
                                    name={iconName as any}
                                    size={22}
                                    color={isFocused ? colors.primary : colors.textLight}
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 34 : 24,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        width: TAB_BAR_WIDTH,
        height: 52,
        backgroundColor: colors.base,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: spacing.md,
        // 뉴모피즘 그림자
        shadowColor: '#A3B1C6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 12,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainerFocused: {
        backgroundColor: 'rgba(178, 223, 219, 0.3)',
    },
});

export default CustomTabBar;
