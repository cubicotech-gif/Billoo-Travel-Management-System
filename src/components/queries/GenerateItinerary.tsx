import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { getQueryForItinerary, type ItineraryData } from '../../lib/api/queries';
import ItineraryPrintView from './ItineraryPrintView';

interface Props {
  queryId: string;
}

export default function GenerateItinerary({ queryId }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ItineraryData | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const itinerary = await getQueryForItinerary(queryId);
      setData(itinerary);
    } catch (err: any) {
      alert('Failed to generate itinerary: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
        title="Generate Itinerary"
      >
        <ClipboardList className="w-4 h-4" />
        {loading ? 'Loading...' : 'Itinerary'}
      </button>

      {data && (
        <ItineraryPrintView
          data={data}
          onClose={() => setData(null)}
        />
      )}
    </>
  );
}
