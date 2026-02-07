/**
 * CustomTabBar - 커스텀 탭 바 컴포넌트
 * 레퍼런스 디자인처럼 좁고 중앙에 위치한 탭 바
 * 
 * 역할별 탭 구성:
 * - 복약자/시니어: 홈, 내 약, 캘린더, 설정 (4탭)
 * - 보호자: 시니어 관리, 설정 (2탭)
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from './theme';
import { useMedicationStore } from '../services/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CustomTabBarProps {
    state: any;
    descriptors: any;
    navigation: any;
}

const icons: Record<string, string> = {
    'health-feed': 'heart',
    index: 'medical',
    calendar: 'calendar',
    'senior-calendar': 'calendar',
    medications: 'add-circle',
    seniors: 'people',
    profile: 'person',
};

// 보호자 전용 탭: 시니어 관리, 시니어 캘린더, 설정 (3탭)
const GUARDIAN_TABS = ['seniors', 'senior-calendar', 'profile'];
// 복약자/시니어 탭: 건강피드, 복약, 캘린더, 설정 (4탭)
const PATIENT_SENIOR_TABS = ['health-feed', 'index', 'calendar', 'profile'];

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
    // 사용자 role 직접 확인
    const user = useMedicationStore((state) => state.user);
    const isGuardian = user?.role === 'guardian';
    
    // 역할에 따라 표시할 탭 결정
    const allowedTabs = isGuardian ? GUARDIAN_TABS : PATIENT_SENIOR_TABS;
    
    // 허용된 탭만 필터링
    const visibleRoutes = state.routes.filter((route: any) => {
        return allowedTabs.includes(route.name);
    });
    
    // 탭 개수에 따라 너비 조정
    const tabBarWidth = visibleRoutes.length <= 2 
        ? SCREEN_WIDTH * 0.45  // 2탭
        : visibleRoutes.length === 3
        ? SCREEN_WIDTH * 0.55  // 3탭 (보호자)
        : SCREEN_WIDTH * 0.70; // 4탭

    return (
        <View style={styles.container}>
            <View style={[styles.tabBar, { width: tabBarWidth }]}>
                {state.routes.map((route: any, index: number) => {
                    const { options } = descriptors[route.key];
                    
                    // 허용된 탭이 아니면 숨김
                    if (!allowedTabs.includes(route.name)) {
                        return null;
                    }
                    
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
        // width는 동적으로 설정됨
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
