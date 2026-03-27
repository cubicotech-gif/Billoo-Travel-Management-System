import { useState, useEffect, useRef } from 'react';
import { Search, User, UserPlus, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PassengerMatch {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
}

interface SelectedPassenger {
  mode: 'existing' | 'new';
  id?: string;
  name: string;
  phone: string;
  email: string;
}

interface Props {
  onSelect: (passenger: SelectedPassenger | null) => void;
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
}

export default function QueryPassengerPicker({ onSelect, initialName, initialPhone, initialEmail }: Props) {
  const [searchTerm, setSearchTerm] = useState(initialName || '');
  const [results, setResults] = useState<PassengerMatch[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<SelectedPassenger | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search passengers as user types
  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2 || selected) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('passengers')
          .select('id, first_name, last_name, phone, email')
          .eq('status', 'active')
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%`)
          .order('first_name')
          .limit(8);
        setResults(data || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selected]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectExisting = (p: PassengerMatch) => {
    const passenger: SelectedPassenger = {
      mode: 'existing',
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      phone: p.phone,
      email: p.email || '',
    };
    setSelected(passenger);
    setSearchTerm(`${p.first_name} ${p.last_name}`);
    setShowDropdown(false);
    onSelect(passenger);
  };

  const handleCreateNew = () => {
    const passenger: SelectedPassenger = {
      mode: 'new',
      name: searchTerm.trim(),
      phone: initialPhone || '',
      email: initialEmail || '',
    };
    setSelected(passenger);
    setShowDropdown(false);
    onSelect(passenger);
  };

  const handleClear = () => {
    setSelected(null);
    setSearchTerm('');
    setResults([]);
    onSelect(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Customer / Passenger *
      </label>

      {selected ? (
        // Selected passenger badge
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${
          selected.mode === 'existing'
            ? 'bg-green-50 border-green-300'
            : 'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            {selected.mode === 'existing' ? (
              <User className="w-4 h-4 text-green-600" />
            ) : (
              <UserPlus className="w-4 h-4 text-blue-600" />
            )}
            <div>
              <span className="text-sm font-medium text-gray-900">{selected.name}</span>
              {selected.mode === 'existing' && selected.phone && (
                <span className="text-xs text-gray-500 ml-2">{selected.phone}</span>
              )}
            </div>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              selected.mode === 'existing'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {selected.mode === 'existing' ? 'Existing' : 'New Profile'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-white/50 rounded"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        // Search input
        <div className="relative">
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm.trim().length >= 2 && setShowDropdown(true)}
              className="flex-1 outline-none text-sm"
              placeholder="Type passenger name to search or create new..."
            />
            {loading && (
              <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full flex-shrink-0" />
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {results.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs text-gray-500 font-medium bg-gray-50 border-b">
                    Existing Passengers
                  </div>
                  {results.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectExisting(p)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {p.first_name} {p.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{p.phone}{p.email ? ` · ${p.email}` : ''}</div>
                      </div>
                      <Check className="w-4 h-4 text-gray-300" />
                    </button>
                  ))}
                </>
              )}

              {/* Create New option — always visible when searching */}
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full text-left px-3 py-3 hover:bg-green-50 flex items-center gap-3 border-t border-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-green-800">
                    Create new passenger: "{searchTerm.trim()}"
                  </div>
                  <div className="text-xs text-green-600">
                    A new profile will be created with this name
                  </div>
                </div>
              </button>

              {results.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
                  No existing passengers match "{searchTerm.trim()}"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!selected && searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
        <p className="text-xs text-gray-400 mt-1">Type at least 2 characters to search</p>
      )}
    </div>
  );
}
