/**
 * TabLayout - 커스텀 탭 네비게이션
 * 좁은 중앙 정렬 탭 바 사용
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
                name="profile"
                options={{
                    title: '설정',
                }}
            />
        </Tabs>
    );
}
