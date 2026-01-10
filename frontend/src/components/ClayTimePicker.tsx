'use client';

import { useState, useEffect, useRef } from 'react';

interface ClayTimePickerProps {
    value: string; // "HH:MM" 24h format
    onChange: (value: string) => void;
}

export default function ClayTimePicker({ value, onChange }: ClayTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Dropdown open states
    const [openDropdown, setOpenDropdown] = useState<'none' | 'hour' | 'minute'>('none');

    const containerRef = useRef<HTMLDivElement>(null);
    const hourListRef = useRef<HTMLDivElement>(null);
    const minuteListRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const [hour24, minute] = value.split(':').map(Number);
    const isPm = hour24 >= 12;
    const hour12 = hour24 % 12 || 12;
    const minuteStr = minute.toString().padStart(2, '0');

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setOpenDropdown('none');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll active item into view when dropdown opens
    useEffect(() => {
        if (openDropdown === 'hour' && hourListRef.current) {
            const activeItem = hourListRef.current.querySelector('[data-active="true"]');
            if (activeItem) {
                // Scroll centering with a slight delay to ensure render
                setTimeout(() => {
                    activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }, 100);
            }
        }
        if (openDropdown === 'minute' && minuteListRef.current) {
            const activeItem = minuteListRef.current.querySelector('[data-active="true"]');
            if (activeItem) {
                setTimeout(() => {
                    activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }, 100);
            }
        }
    }, [openDropdown]);

    const updateTime = (newIsPm: boolean, newHour12: number, newMinute: number) => {
        let newHour24 = newHour12;
        if (newIsPm && newHour12 !== 12) newHour24 += 12;
        if (!newIsPm && newHour12 === 12) newHour24 = 0;

        const h = newHour24.toString().padStart(2, '0');
        const m = newMinute.toString().padStart(2, '0');
        onChange(`${h}:${m}`);
    };

    const toggleAmPm = () => {
        updateTime(!isPm, hour12, minute);
    };

    const handleHourSelect = (newHour: number) => {
        updateTime(isPm, newHour, minute);
        setOpenDropdown('none');
    };

    const handleMinuteSelect = (newMinute: number) => {
        updateTime(isPm, hour12, newMinute);
        setOpenDropdown('none');
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Trigger Button - Main Input Display */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="clay-time-input flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
            >
                <span className={`font-bold ${isPm ? 'text-indigo-500' : 'text-orange-500'}`}>
                    {isPm ? '오후' : '오전'}
                </span>
                <span className="text-xl text-gray-700">
                    {hour12.toString().padStart(2, '0')}:{minuteStr}
                </span>
            </button>

            {/* Main Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 p-4 z-50 rounded-[30px] animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        background: 'var(--color-surface)',
                        boxShadow: '20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.5)'
                    }}
                >
                    <div className="flex items-center justify-between gap-3 relative">
                        {/* AM/PM Toggle */}
                        <button
                            type="button"
                            onClick={toggleAmPm}
                            className={`flex-1 py-3 px-2 rounded-2xl font-bold text-sm transition-all shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] ${isPm
                                    ? 'text-indigo-600 bg-[#E8EAF6]'
                                    : 'text-orange-600 bg-[#FFF3E0]'
                                }`}
                        >
                            {isPm ? '오후' : '오전'}
                        </button>

                        <span className="text-gray-300">|</span>

                        {/* Hour Trigger */}
                        <div className="flex-1 relative">
                            <button
                                type="button"
                                onClick={() => setOpenDropdown(openDropdown === 'hour' ? 'none' : 'hour')}
                                className={`w-full py-3 px-2 rounded-2xl font-bold text-lg flex items-center justify-center gap-1 transition-all ${openDropdown === 'hour'
                                        ? 'bg-[#E0E5E9] shadow-[inset_2px_2px_5px_#c1c9d2,inset_-2px_-2px_5px_#ffffff] text-gray-800' // Pressed state
                                        : 'bg-[#EFF3F6] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] text-gray-600' // Normal state
                                    }`}
                            >
                                {hour12}
                            </button>

                            {/* Custom Hour List Dropdown */}
                            {openDropdown === 'hour' && (
                                <div
                                    ref={hourListRef}
                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-32 max-h-48 overflow-y-auto custom-scrollbar z-50 p-2 rounded-[24px]"
                                    style={{
                                        background: 'var(--color-surface)',
                                        boxShadow: '10px 10px 30px #d1d9e6, -10px -10px 30px #ffffff',
                                        border: '1px solid rgba(255, 255, 255, 0.5)'
                                    }}
                                >
                                    <div className="flex flex-col gap-2">
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleHourSelect(h); }}
                                                data-active={hour12 === h}
                                                className={`w-full py-3 rounded-xl font-bold text-base transition-all ${hour12 === h
                                                        ? 'bg-[#7BC49A] text-white shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)]'
                                                        : 'text-gray-600 hover:bg-[#F0F4F8]'
                                                    }`}
                                            >
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <span className="font-bold text-gray-400">:</span>

                        {/* Minute Trigger */}
                        <div className="flex-1 relative">
                            <button
                                type="button"
                                onClick={() => setOpenDropdown(openDropdown === 'minute' ? 'none' : 'minute')}
                                className={`w-full py-3 px-2 rounded-2xl font-bold text-lg flex items-center justify-center gap-1 transition-all ${openDropdown === 'minute'
                                        ? 'bg-[#E0E5E9] shadow-[inset_2px_2px_5px_#c1c9d2,inset_-2px_-2px_5px_#ffffff] text-gray-800'
                                        : 'bg-[#EFF3F6] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] text-gray-600'
                                    }`}
                            >
                                {minuteStr}
                            </button>

                            {/* Custom Minute List Dropdown */}
                            {openDropdown === 'minute' && (
                                <div
                                    ref={minuteListRef}
                                    className="absolute top-full right-0 mt-4 w-32 max-h-48 overflow-y-auto custom-scrollbar z-50 p-2 rounded-[24px]"
                                    style={{
                                        background: 'var(--color-surface)',
                                        boxShadow: '10px 10px 30px #d1d9e6, -10px -10px 30px #ffffff',
                                        border: '1px solid rgba(255, 255, 255, 0.5)'
                                    }}
                                >
                                    <div className="flex flex-col gap-2">
                                        {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleMinuteSelect(m); }}
                                                data-active={minute === m}
                                                className={`w-full py-3 rounded-xl font-bold text-base transition-all ${minute === m
                                                        ? 'bg-[#7BC49A] text-white shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)]'
                                                        : 'text-gray-600 hover:bg-[#F0F4F8]'
                                                    }`}
                                            >
                                                {m.toString().padStart(2, '0')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
