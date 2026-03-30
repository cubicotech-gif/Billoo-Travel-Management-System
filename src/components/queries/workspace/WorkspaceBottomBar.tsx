'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Package,
  Send,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import type { Query, QueryStage } from '@/types/query';

interface Props {
  query: Query;
  onStageChange: (stage: QueryStage) => void;
  onBack: () => void;
}

export default function WorkspaceBottomBar({ query, onStageChange, onBack }: Props) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const stage = query.stage;

  const stageButtons = getStageButtons(stage, onStageChange);

  return (
    <div className="sticky bottom-0 z-10 bg-white border-t">
      <div className="px-4 py-3 sm:px-6 flex items-center justify-between gap-3">
        {/* Left side: back + cancel */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {stage !== 'cancelled' && stage !== 'completed' && (
            <>
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Query
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">Are you sure?</span>
                  <button
                    onClick={() => {
                      onStageChange('cancelled');
                      setShowCancelConfirm(false);
                    }}
                    className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                  >
                    Yes, cancel
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right side: stage action buttons */}
        <div className="flex items-center gap-2">
          {stageButtons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.onClick}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${btn.className}`}
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StageButton {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className: string;
}

function getStageButtons(
  stage: QueryStage,
  onStageChange: (stage: QueryStage) => void
): StageButton[] {
  switch (stage) {
    case 'new_inquiry':
      return [
        {
          label: 'Start Building Package',
          icon: <Package className="w-4 h-4" />,
          onClick: () => onStageChange('building_package'),
          className: 'text-white bg-blue-600 hover:bg-blue-700',
        },
      ];

    case 'building_package':
      return [
        {
          label: 'Back to Inquiry',
          icon: <ArrowLeft className="w-4 h-4" />,
          onClick: () => onStageChange('new_inquiry'),
          className: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50',
        },
        {
          label: 'Send Quote to Client',
          icon: <Send className="w-4 h-4" />,
          onClick: () => onStageChange('quote_sent'),
          className: 'text-white bg-purple-600 hover:bg-purple-700',
        },
      ];

    case 'quote_sent':
      return [
        {
          label: 'Back to Building',
          icon: <ArrowLeft className="w-4 h-4" />,
          onClick: () => onStageChange('building_package'),
          className: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50',
        },
        {
          label: 'Client Wants Changes',
          icon: <RefreshCw className="w-4 h-4" />,
          onClick: () => onStageChange('negotiating'),
          className: 'text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100',
        },
        {
          label: 'Client Confirmed',
          icon: <CheckCircle2 className="w-4 h-4" />,
          onClick: () => onStageChange('confirmed_paying'),
          className: 'text-white bg-green-600 hover:bg-green-700',
        },
      ];

    case 'negotiating':
      return [
        {
          label: 'Back to Building',
          icon: <ArrowLeft className="w-4 h-4" />,
          onClick: () => onStageChange('building_package'),
          className: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50',
        },
        {
          label: 'Resend Quote',
          icon: <Send className="w-4 h-4" />,
          onClick: () => onStageChange('quote_sent'),
          className: 'text-white bg-purple-600 hover:bg-purple-700',
        },
      ];

    case 'confirmed_paying':
      return [
        {
          label: 'Start Booking & Docs',
          icon: <ArrowRight className="w-4 h-4" />,
          onClick: () => onStageChange('booking_docs'),
          className: 'text-white bg-indigo-600 hover:bg-indigo-700',
        },
      ];

    case 'booking_docs':
      return [
        {
          label: 'Back to Confirmed',
          icon: <ArrowLeft className="w-4 h-4" />,
          onClick: () => onStageChange('confirmed_paying'),
          className: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50',
        },
        {
          label: 'Ready to Travel',
          icon: <CheckCircle2 className="w-4 h-4" />,
          onClick: () => onStageChange('ready_to_travel'),
          className: 'text-white bg-teal-600 hover:bg-teal-700',
        },
      ];

    case 'ready_to_travel':
      return [
        {
          label: 'Back to Booking',
          icon: <ArrowLeft className="w-4 h-4" />,
          onClick: () => onStageChange('booking_docs'),
          className: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50',
        },
        {
          label: 'Mark Completed',
          icon: <CheckCircle2 className="w-4 h-4" />,
          onClick: () => onStageChange('completed'),
          className: 'text-white bg-emerald-600 hover:bg-emerald-700',
        },
      ];

    case 'completed':
      return [
        {
          label: 'Reopen Query',
          icon: <RefreshCw className="w-4 h-4" />,
          onClick: () => onStageChange('ready_to_travel'),
          className: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50',
        },
      ];

    case 'cancelled':
      return [
        {
          label: 'Reopen as New Inquiry',
          icon: <RefreshCw className="w-4 h-4" />,
          onClick: () => onStageChange('new_inquiry'),
          className: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50',
        },
      ];

    default:
      return [];
  }
}
