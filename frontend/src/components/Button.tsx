import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'success' | 'danger' | 'outline';
    size?: 'default' | 'large';
    isLoading?: boolean;
    children: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'default',
    isLoading = false,
    children,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = 'btn';

    const variantStyles = {
        primary: 'btn-primary',
        success: 'btn-success',
        danger: 'btn-danger',
        outline: '',
    };

    const sizeStyles = {
        default: {},
        large: {
            minHeight: '80px',
            fontSize: 'var(--font-size-xl)',
        },
    };

    const outlineStyles = variant === 'outline' ? {
        background: 'var(--color-surface)',
        border: '2px solid var(--color-primary)',
        color: 'var(--color-primary)',
    } : {};

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
            disabled={disabled || isLoading}
            style={{
                ...sizeStyles[size],
                ...outlineStyles,
                opacity: disabled || isLoading ? 0.6 : 1,
            }}
            {...props}
        >
            {isLoading ? '로딩 중...' : children}
        </button>
    );
}
