/**
 * Yak-Sok 테마 설정
 * Neumorphism + Pastel Design System
 * 부드럽고 편안한 파스텔 색상과 3D 뉴모피즘 효과
 */

export const colors = {
    // 파스텔 색상 팔레트 (Soft & Comfortable)
    mint: '#B2DFDB',           // 파스텔 민트 - Primary
    mintLight: '#E0F2F1',      // 민트 라이트
    mintDark: '#80CBC4',       // 민트 다크

    blue: '#B3E5FC',           // 파스텔 블루
    blueLight: '#E1F5FE',      // 블루 라이트
    blueDark: '#81D4FA',       // 블루 다크

    peach: '#FFCCBC',          // 파스텔 피치 (따뜻한 포인트)
    peachLight: '#FBE9E7',     // 피치 라이트
    peachDark: '#FFAB91',      // 피치 다크

    lavender: '#E1BEE7',       // 파스텔 라벤더
    lavenderLight: '#F3E5F5',  // 라벤더 라이트
    lavenderDark: '#CE93D8',   // 라벤더 다크

    // Neumorphism Backgrounds (Soft Gray Tones)
    base: '#F2F5F8',           // 더 밝은 소프트 그레이 (3D 효과용)
    baseLight: '#FFFFFF',      // 하이라이트
    baseDark: '#D8DEE6',       // 그림자용 다크

    cream: '#F5F0EA',          // 크림 (따뜻한 배경 옵션)

    // Semantic Colors
    primary: '#80CBC4',        // 민트 기반 Primary
    primaryLight: '#B2DFDB',
    primaryDark: '#4DB6AC',

    success: '#A5D6A7',        // 파스텔 그린
    successDark: '#81C784',

    warning: '#FFE0B2',        // 파스텔 오렌지
    warningDark: '#FFCC80',

    danger: '#FFCDD2',         // 파스텔 레드
    dangerLight: '#FFEBEE',    // 레드 라이트
    dangerDark: '#EF9A9A',

    // Text Colors
    text: '#37474F',           // 메인 텍스트 (부드러운 다크)
    textSecondary: '#607D8B',  // 보조 텍스트
    textLight: '#90A4AE',      // 연한 텍스트
    textMuted: '#B0BEC5',      // 뮤트 텍스트

    // Basic Colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',

    // Legacy aliases (for compatibility)
    background: '#E8EDF2',
    surface: '#E8EDF2',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 40,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    pill: 50,
    round: 999,
};

export const fontSize = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
};

export const fontWeight = {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
};

// 뉴모피즘 그림자 스타일 (3D Soft UI)
export const shadows = {
    // Convex (Extruded) - For cards, buttons
    light: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: -6, height: -6 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 0,
    },
    dark: {
        shadowColor: '#B8C4CE',
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },

    // Concave (Inset) - For inputs, pressed states
    insetLight: {
        borderTopColor: 'rgba(184, 196, 206, 0.4)',
        borderLeftColor: 'rgba(184, 196, 206, 0.4)',
        borderBottomColor: 'rgba(255, 255, 255, 0.8)',
        borderRightColor: 'rgba(255, 255, 255, 0.8)',
    },

    // Soft shadow for subtle elevation
    soft: {
        shadowColor: '#B8C4CE',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },

    // Colored shadows for accent elements
    mint: {
        shadowColor: '#80CBC4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },

    // Pressed state simulation
    pressed: {
        backgroundColor: colors.base,
        borderWidth: 2,
        borderTopColor: 'rgba(184, 196, 206, 0.5)',
        borderLeftColor: 'rgba(184, 196, 206, 0.5)',
        borderBottomColor: 'rgba(255, 255, 255, 0.9)',
        borderRightColor: 'rgba(255, 255, 255, 0.9)',
    },
};

// 뉴모피즘 카드 스타일 프리셋
export const neumorphism = {
    // Convex card (raised)
    card: {
        backgroundColor: colors.base,
        borderRadius: borderRadius.xxl,
        padding: spacing.xl,
    },

    // Inset container (sunken)
    inset: {
        backgroundColor: colors.base,
        borderRadius: borderRadius.xl,
        borderWidth: 2,
        ...shadows.insetLight,
    },

    // Pill button
    button: {
        backgroundColor: colors.base,
        borderRadius: borderRadius.pill,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xxl,
    },

    // Circle icon button
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.base,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
};

export const theme = {
    colors,
    spacing,
    borderRadius,
    fontSize,
    fontWeight,
    shadows,
    neumorphism,
};

export default theme;
