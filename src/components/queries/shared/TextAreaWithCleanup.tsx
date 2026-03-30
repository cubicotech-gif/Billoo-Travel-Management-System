import { useState, useRef } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { localCleanup } from '@/lib/textUtils';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
}

export default function TextAreaWithCleanup({ value, onChange, placeholder, rows = 3, className = '', label }: Props) {
  const [status, setStatus] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleCleanup = () => {
    if (!value || value.trim().length === 0) return;
    const cleaned = localCleanup(value);
    const changed = cleaned !== value;
    if (changed) {
      onChange(cleaned);
      setStatus({ text: 'Text cleaned up!', type: 'success' });
    } else {
      setStatus({ text: 'Text looks good — no changes needed', type: 'info' });
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
        />
        {value && value.trim().length > 10 && (
          <button
            type="button"
            onClick={handleCleanup}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
            title="Clean up text"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {status && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${status.type === 'success' ? 'text-green-600' : 'text-gray-500'}`}>
          <Check className="w-3 h-3" />
          {status.text}
        </div>
      )}
    </div>
  );
}
