'use client';

import { useState, useMemo } from 'react';
import { Package, Users, FileText, StickyNote } from 'lucide-react';
import type { Query, QueryService, QueryPassenger, QueryStage } from '@/types/query';
import ServicesTab from '../services/ServicesTab';
import PassengersTab from '../passengers/PassengersTab';
import DocumentsTab from '../documents/DocumentsTab';
import NotesInfoTab from '../notes/NotesInfoTab';

interface Props {
  query: Query;
  services: QueryService[];
  passengers: QueryPassenger[];
  onRefresh: () => void;
}

interface TabDef {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const ALL_TABS: TabDef[] = [
  { id: 'services', label: 'Services', icon: <Package className="w-4 h-4" /> },
  { id: 'passengers', label: 'Passengers', icon: <Users className="w-4 h-4" /> },
  { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { id: 'notes', label: 'Notes & Info', icon: <StickyNote className="w-4 h-4" /> },
];

function getTabsForStage(stage: QueryStage): string[] {
  if (stage === 'new_inquiry') {
    return ['passengers', 'documents', 'notes'];
  }
  // building_package and beyond: all tabs
  return ['services', 'passengers', 'documents', 'notes'];
}

export default function WorkspaceTabs({ query, services, passengers, onRefresh }: Props) {
  const availableTabIds = useMemo(() => getTabsForStage(query.stage), [query.stage]);
  const availableTabs = useMemo(
    () => ALL_TABS.filter((t) => availableTabIds.includes(t.id)),
    [availableTabIds]
  );

  const [activeTab, setActiveTab] = useState(availableTabs[0]?.id ?? 'passengers');

  // If active tab is no longer available (e.g. stage changed), reset
  const currentTab = availableTabIds.includes(activeTab)
    ? activeTab
    : availableTabs[0]?.id ?? 'passengers';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab navigation */}
      <div className="border-b border-gray-200 bg-white px-4 sm:px-6">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {availableTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'services' && services.length > 0 && (
                  <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {services.length}
                  </span>
                )}
                {tab.id === 'passengers' && passengers.length > 0 && (
                  <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {passengers.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {currentTab === 'services' && (
          <ServicesTab query={query} services={services} onRefresh={onRefresh} />
        )}
        {currentTab === 'passengers' && (
          <PassengersTab query={query} passengers={passengers} onRefresh={onRefresh} />
        )}
        {currentTab === 'documents' && (
          <DocumentsTab queryId={query.id} passengers={passengers} />
        )}
        {currentTab === 'notes' && (
          <NotesInfoTab query={query} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
}
