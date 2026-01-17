/**
 * TabLayout - 커스텀 탭 네비게이션
 * 좁은 중앙 정렬 탭 바 사용
 * 보호자는 시니어 관리 탭이 추가됨 (CustomTabBar에서 role 기반 필터링)
 */

import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../components/CustomTabBar';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
            }}
            tabBar={(props) => <CustomTabBar {...props} />}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: '홈',
                }}
            />
            <Tabs.Screen
                name="medications"
                options={{
                    title: '내 약',
                }}
            />
            <Tabs.Screen
                name="seniors"
                options={{
                    title: '시니어',
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: '캘린더',
                }}
            />
            <Tabs.Screen
                name="senior-calendar"
                options={{
                    title: '시니어 캘린더',
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: '설정',
                }}
            />
        </Tabs>
    );
}
