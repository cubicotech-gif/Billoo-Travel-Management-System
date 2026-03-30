import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { queryApi } from '@/lib/api/queries';
import type { Query, QueryStage } from '@/types/query';
import { STAGE_CONFIG } from '@/types/query';
import QueryList from '@/components/queries/QueryList';
import CreateQueryModal from '@/components/queries/create/CreateQueryModal';

const STAGE_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new_inquiry', label: 'New' },
  { value: 'building_package', label: 'Building' },
  { value: 'quote_sent', label: 'Quote Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'confirmed_paying', label: 'Confirmed' },
  { value: 'booking_docs', label: 'Booking' },
  { value: 'ready_to_travel', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Queries() {
  const navigate = useNavigate();
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [showCreate, setShowCreate] = useState(false);

  const loadQueries = useCallback(async () => {
    try {
      setLoading(true);
      const [data, counts] = await Promise.all([
        queryApi.getAll({ stage: stageFilter, search: search || undefined }),
        queryApi.getStageCounts(),
      ]);
      setQueries(data);
      setStageCounts(counts);
    } catch (err) {
      console.error('Failed to load queries:', err);
    } finally {
      setLoading(false);
    }
  }, [stageFilter, search]);

  useEffect(() => {
    loadQueries();
  }, [loadQueries]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalCount = Object.values(stageCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Queries</h1>
          <p className="text-sm text-gray-500 mt-1">{totalCount} total queries</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          New Query
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, phone, destination, query number..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Stage filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {STAGE_TABS.map(tab => {
          const count = tab.value === 'all' ? totalCount : (stageCounts[tab.value] || 0);
          const isActive = stageFilter === tab.value;
          const config = tab.value !== 'all' ? STAGE_CONFIG[tab.value as QueryStage] : null;
          return (
            <button
              key={tab.value}
              onClick={() => setStageFilter(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? config
                    ? `${config.bgColor} ${config.color} ring-1 ${config.borderColor}`
                    : 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/30' : 'bg-gray-200'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Query list */}
      <QueryList
        queries={queries}
        loading={loading}
        onQueryClick={id => navigate(`/queries/${id}`)}
      />

      {/* Create modal */}
      {showCreate && (
        <CreateQueryModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={(query) => {
            setShowCreate(false);
            navigate(`/queries/${query.id}`);
          }}
        />
      )}
    </div>
  );
}
