'use client';

interface ClayTimePickerProps {
    value: string; // "HH:MM" 24h format
    onChange: (value: string) => void;
}

export default function ClayTimePicker({ value, onChange }: ClayTimePickerProps) {
    // Parse current value for display
    const [hour24, minute] = value.split(':').map(Number);
    const isPm = hour24 >= 12;
    const hour12 = hour24 % 12 || 12;
    const minuteStr = minute.toString().padStart(2, '0');

    return (
        <div className="clay-time-picker-wrapper">
            {/* Display Label */}
            <span className={`clay-time-label ${isPm ? 'pm' : 'am'}`}>
                {isPm ? '오후' : '오전'}
            </span>
            <span className="clay-time-display">
                {hour12}:{minuteStr}
            </span>

            {/* Hidden Native Input for Mobile Picker */}
            <input
                type="time"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="clay-native-time-input"
            />
        </div>
    );
}
