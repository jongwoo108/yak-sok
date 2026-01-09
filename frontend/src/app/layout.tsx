import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: '약속 (Yak-Sok) - 복약 관리',
    description: '시니어 맞춤형 복약 관리 및 응급 상황 감지 시스템',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: '약속',
    },
};

export const viewport: Viewport = {
    themeColor: '#4F46E5',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <body className={inter.className}>
                <main className="min-h-screen bg-gray-50">
                    {children}
                </main>
            </body>
        </html>
    );
}
