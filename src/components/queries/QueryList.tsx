import { Loader2, Inbox } from 'lucide-react';
import type { Query } from '@/types/query';
import QueryCard from './QueryCard';

interface Props {
  queries: Query[];
  loading: boolean;
  onQueryClick: (id: string) => void;
}

export default function QueryList({ queries, loading, onQueryClick }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading queries...</p>
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Inbox className="w-12 h-12 mb-3 stroke-[1.5]" />
        <p className="text-base font-medium text-gray-500">No queries found</p>
        <p className="text-sm mt-1">Try adjusting your filters or create a new query.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {queries.map((query) => (
        <QueryCard
          key={query.id}
          query={query}
          onClick={() => onQueryClick(query.id)}
        />
      ))}
    </div>
  );
}
