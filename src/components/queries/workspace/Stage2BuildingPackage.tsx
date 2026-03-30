'use client';

import { useState, useMemo } from 'react';
import { Package, Users, FileText, StickyNote } from 'lucide-react';
import type { Query, QueryService, QueryPassenger, QueryStage } from '@/types/query';
import { formatCurrency, calculateProfitMargin, formatPercentage } from '@/lib/formatCurrency';
import ServicesTab from '../services/ServicesTab';
import PassengersTab from '../passengers/PassengersTab';
import DocumentsTab from '../documents/DocumentsTab';
import NotesInfoTab from '../notes/NotesInfoTab';

interface Props {
  query: Query;
  services: QueryService[];
  passengers: QueryPassenger[];
  onStageChange: (stage: QueryStage) => void;
  onRefresh: () => void;
}

interface TabDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export default function Stage2BuildingPackage({
  query,
  services,
  passengers,
  onStageChange: _onStageChange,
  onRefresh,
}: Props) {
  const [activeTab, setActiveTab] = useState<string>('services');

  const tabs: TabDef[] = useMemo(
    () => [
      { id: 'services', label: 'Services', icon: <Package className="w-4 h-4" />, count: services.length },
      { id: 'passengers', label: 'Passengers', icon: <Users className="w-4 h-4" />, count: passengers.length },
      { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
      { id: 'notes', label: 'Notes & Info', icon: <StickyNote className="w-4 h-4" /> },
    ],
    [services.length, passengers.length]
  );

  const serviceSummary = useMemo(() => {
    if (services.length === 0) return null;

    const totalSellingPkr = services.reduce((sum, s) => sum + s.selling_price_pkr, 0);
    const totalProfitPkr = services.reduce((sum, s) => sum + s.profit_pkr, 0);
    const margin = calculateProfitMargin(totalProfitPkr, totalSellingPkr);

    return {
      count: services.length,
      total: formatCurrency(totalSellingPkr, 'PKR'),
      profit: formatCurrency(totalProfitPkr, 'PKR'),
      margin: formatPercentage(margin),
    };
  }, [services]);

  return (
    <div className="space-y-4">
      {/* Stage header */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <h2 className="text-lg font-semibold text-amber-800">Building Package</h2>
        </div>
        <p className="mt-1 text-sm text-amber-700">
          Add services, link passengers, and prepare the quote.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 bg-white px-4 sm:px-6 rounded-t-xl">
        <nav className="-mb-px flex gap-6" aria-label="Workspace tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-0">
        {activeTab === 'services' && (
          <div className="space-y-3">
            {serviceSummary && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-100">
                <Package className="w-4 h-4 text-gray-400" />
                <span>
                  {serviceSummary.count} {serviceSummary.count === 1 ? 'service' : 'services'}
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  Total: <span className="font-medium text-gray-800">{serviceSummary.total}</span>
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  Profit:{' '}
                  <span className="font-medium text-green-700">
                    {serviceSummary.profit} ({serviceSummary.margin})
                  </span>
                </span>
              </div>
            )}
            <ServicesTab query={query} services={services} onRefresh={onRefresh} />
          </div>
        )}

        {activeTab === 'passengers' && (
          <PassengersTab query={query} passengers={passengers} onRefresh={onRefresh} />
        )}

        {activeTab === 'documents' && (
          <DocumentsTab queryId={query.id} passengers={passengers} />
        )}

        {activeTab === 'notes' && (
          <NotesInfoTab query={query} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
}
