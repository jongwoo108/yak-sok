import 'dotenv/config';

export default {
    expo: {
        name: "약속",
        slug: "yak-sok",
        version: "1.0.1",
        orientation: "portrait",
        // React Native New Architecture (TurboModules/Fabric) 비활성화
        newArchEnabled: false,
        icon: "./assets/icon.png",
        scheme: "yaksok",
        userInterfaceStyle: "light",
        splash: {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#F0F7F4"
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.jongwoo.yaksok",
            // Expo가 생성하는 타겟 이름을 명시적으로 지정 (slug 기반)
            // 하이픈이 있으면 Xcode에서 문제가 될 수 있어서 언더스코어로 변환
            buildNumber: "9",
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false,
                NSCameraUsageDescription: "처방전을 촬영하기 위해 카메라 접근이 필요합니다.",
                NSPhotoLibraryUsageDescription: "처방전 이미지를 선택하기 위해 사진 접근이 필요합니다.",
                NSPhotoLibraryAddUsageDescription: "촬영한 이미지를 사진 보관함에 저장하기 위해 필요합니다."
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#F0F7F4"
            },
            package: "com.jongwoo.yaksok"
        },
        web: {
            favicon: "./assets/favicon.png",
            bundler: "metro",
            output: "single"
        },
        plugins: [
            "expo-router",
            [
                "expo-build-properties",
                {
                    ios: {
                        newArchEnabled: false
                    },
                    android: {
                        newArchEnabled: false
                    }
                }
            ],
            [
                "expo-notifications",
                {
                    icon: "./assets/icon.png",
                    color: "#50B498"
                }
            ]
        ],
        experiments: {
            typedRoutes: true
        },
        extra: {
            router: {},
            eas: {
                projectId: "dc59cea5-ac4a-4706-89e4-fcda750a2bc4"
            },
            googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
            googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
            googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
            apiBaseUrl: process.env.API_BASE_URL,
        },
        owner: "jongwoo1008"
    }
};
