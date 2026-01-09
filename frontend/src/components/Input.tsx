import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({
    label,
    error,
    className = '',
    id,
    ...props
}: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
        <div className="w-full" style={{ marginBottom: 'var(--spacing-lg)' }}>
            {label && (
                <label
                    htmlFor={inputId}
                    style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                    }}
                >
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`input ${className}`}
                style={{
                    borderColor: error ? 'var(--color-danger)' : undefined,
                }}
                {...props}
            />
            {error && (
                <p style={{
                    marginTop: '0.5rem',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-danger)',
                }}>
                    {error}
                </p>
            )}
        </div>
    );
}
