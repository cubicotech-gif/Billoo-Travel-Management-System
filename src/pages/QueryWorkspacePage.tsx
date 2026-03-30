import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { queryApi, queryServiceApi, queryPassengerApi } from '@/lib/api/queries';
import type { Query, QueryService, QueryPassenger, QueryStage } from '@/types/query';
import WorkspaceTopBar from '@/components/queries/workspace/WorkspaceTopBar';
import WorkspaceBottomBar from '@/components/queries/workspace/WorkspaceBottomBar';
import WorkspaceTabs from '@/components/queries/workspace/WorkspaceTabs';

export default function QueryWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState<Query | null>(null);
  const [services, setServices] = useState<QueryService[]>([]);
  const [passengers, setPassengers] = useState<QueryPassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [q, svcs, pax] = await Promise.all([
        queryApi.getById(id),
        queryServiceApi.getByQuery(id),
        queryPassengerApi.getByQuery(id),
      ]);
      setQuery(q);
      setServices(svcs);
      setPassengers(pax);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load query');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStageChange = async (newStage: QueryStage) => {
    if (!query) return;
    try {
      const updated = await queryApi.changeStage(query.id, newStage);
      setQuery(updated);
    } catch (err: any) {
      alert('Failed to change stage: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !query) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <p className="text-red-600 mb-4">{error || 'Query not found'}</p>
        <button onClick={() => navigate('/queries')} className="text-blue-600 hover:underline">
          Back to Queries
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Back button */}
      <div className="px-6 py-2">
        <button
          onClick={() => navigate('/queries')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Queries
        </button>
      </div>

      {/* Top bar */}
      <WorkspaceTopBar query={query} services={services} />

      {/* Main content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <WorkspaceTabs
          query={query}
          services={services}
          passengers={passengers}
          onRefresh={loadData}
        />
      </div>

      {/* Bottom bar */}
      <WorkspaceBottomBar
        query={query}
        onStageChange={handleStageChange}
        onBack={() => navigate('/queries')}
      />
    </div>
  );
}
