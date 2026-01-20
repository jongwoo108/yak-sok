import 'dotenv/config';

export default {
    expo: {
        name: "약속",
        slug: "yak-sok",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        scheme: "yaksok",
        userInterfaceStyle: "light",
        newArchEnabled: false,
        splash: {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#F0F7F4"
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.jongwoo.yaksok",
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#F0F7F4"
            },
            package: "com.jongwoo.yaksok",
            edgeToEdgeEnabled: true
        },
        web: {
            favicon: "./assets/favicon.png",
            bundler: "metro",
            output: "single"
        },
        plugins: [
            "expo-router",
            "expo-secure-store",
            "expo-web-browser",
            "expo-notifications"
        ],
        experiments: {
            typedRoutes: true
        },
        extra: {
            router: {},
            eas: {
                projectId: "70068664-24f1-4b81-80c5-eadeaa95cdb5"
            },
            // 환경변수를 앱에서 접근 가능하게 설정
            googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
            googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
            googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
            apiBaseUrl: process.env.API_BASE_URL,
        },
        owner: "jongwoo108"
    }
};
