/** @type {import('next').NextConfig} */
const nextConfig = {
    // PWA를 위한 설정
    reactStrictMode: true,

    // API 프록시 설정
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:8000/api/:path*',
            },
        ];
    },

    // 이미지 도메인 설정
    images: {
        domains: ['localhost'],
    },
};

module.exports = nextConfig;
