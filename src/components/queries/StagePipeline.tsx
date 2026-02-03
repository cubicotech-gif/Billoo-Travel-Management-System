import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { QueryStatus } from '../../types/query-workflow';

interface Stage {
  key: QueryStatus;
  label: string;
  icon: string;
  color: string;
}

interface Props {
  onStageClick: (stage: QueryStatus) => void;
  currentFilter?: QueryStatus | null;
}

const STAGES: Stage[] = [
  { key: 'New Query - Not Responded', label: 'New', icon: '🔴', color: 'red' },
  { key: 'Responded - Awaiting Reply', label: 'Responded', icon: '🟡', color: 'yellow' },
  { key: 'Working on Proposal', label: 'Building', icon: '🔵', color: 'blue' },
  { key: 'Proposal Sent', label: 'Proposal', icon: '🟢', color: 'green' },
  { key: 'Revisions Requested', label: 'Revisions', icon: '🟣', color: 'purple' },
  { key: 'Finalized & Booking', label: 'Booking', icon: '✅', color: 'teal' },
  { key: 'Services Booked', label: 'Booked', icon: '📦', color: 'indigo' },
  { key: 'In Delivery', label: 'Delivery', icon: '🚚', color: 'cyan' },
  { key: 'Completed', label: 'Done', icon: '✅', color: 'emerald' },
];

export default function StagePipeline({ onStageClick, currentFilter }: Props) {
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStageCounts();

    // Refresh every 30 seconds
    const interval = setInterval(loadStageCounts, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadStageCounts = async () => {
    try {
      const counts: Record<string, number> = {};

      for (const stage of STAGES) {
        const { count, error } = await supabase
          .from('queries')
          .select('*', { count: 'exact', head: true })
          .eq('status', stage.key);

        if (error) {
          console.error(`Error loading count for ${stage.key}:`, error);
          counts[stage.key] = 0;
        } else {
          counts[stage.key] = count || 0;
        }
      }

      setStageCounts(counts);
    } catch (error) {
      console.error('Error loading stage counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: string, hasCount: boolean, isActive: boolean) => {
    if (isActive) {
      return {
        bg: `bg-${color}-100 border-${color}-500`,
        text: `text-${color}-900`,
        badge: `bg-${color}-600 text-white`
      };
    }

    if (hasCount) {
      return {
        bg: `bg-${color}-50 border-${color}-300`,
        text: `text-${color}-800`,
        badge: `bg-${color}-500 text-white`
      };
    }

    return {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-600',
      badge: 'bg-gray-400 text-white'
    };
  };

  const totalQueries = Object.values(stageCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Query Pipeline</h3>
        <div className="text-sm text-gray-600">
          Total Queries: <span className="font-semibold text-gray-900">{totalQueries}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STAGES.map((_, index) => (
            <div key={index} className="flex items-center">
              <div className="min-w-[120px] h-20 bg-gray-100 rounded-xl animate-pulse" />
              {index < STAGES.length - 1 && <div className="w-4 h-0.5 bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STAGES.map((stage, index) => {
            const count = stageCounts[stage.key] || 0;
            const isActive = currentFilter === stage.key;
            const colors = getColorClasses(stage.color, count > 0, isActive);

            return (
              <div key={stage.key} className="flex items-center">
                <button
                  onClick={() => onStageClick(stage.key)}
                  className={`
                    relative px-4 py-3 rounded-xl border-2 transition-all
                    hover:scale-105 hover:shadow-md active:scale-95
                    ${colors.bg}
                    ${isActive ? 'shadow-lg ring-2 ring-offset-2 ring-' + stage.color + '-500' : ''}
                    min-w-[120px]
                  `}
                  title={`${stage.label}: ${count} queries`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{stage.icon}</div>
                    <div className={`text-xs font-medium ${colors.text}`}>
                      {stage.label}
                    </div>

                    {/* COUNT BADGE */}
                    {count > 0 && (
                      <div
                        className={`
                          absolute -top-2 -right-2
                          w-7 h-7 rounded-full
                          ${colors.badge}
                          flex items-center justify-center
                          text-xs font-bold
                          shadow-lg
                          animate-pulse
                        `}
                      >
                        {count}
                      </div>
                    )}
                  </div>
                </button>

                {index < STAGES.length - 1 && (
                  <div className="w-4 h-0.5 bg-gray-300 mx-1 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Active stage has blue ring</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-200" />
            <span>Empty stages are grayed out</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">Click any stage</span>
            <span>to filter queries</span>
          </div>
        </div>
      </div>
    </div>
  );
}
