import { CheckCircle2 } from 'lucide-react';
import { STAGE_CONFIG, type QueryStage } from '@/types/query';

interface Props {
  currentStage: QueryStage;
}

const PIPELINE_STAGES: QueryStage[] = [
  'new_inquiry',
  'building_package',
  'quote_sent',
  'negotiating',
  'confirmed_paying',
  'booking_docs',
  'ready_to_travel',
  'completed',
];

export default function StagePipeline({ currentStage }: Props) {
  const currentOrder = STAGE_CONFIG[currentStage]?.order ?? 0;
  const isCancelled = currentStage === 'cancelled';

  return (
    <div className="flex items-center w-full">
      {PIPELINE_STAGES.map((stage, index) => {
        const config = STAGE_CONFIG[stage];
        const stageOrder = config.order;
        const isActive = stage === currentStage;
        const isPast = !isCancelled && stageOrder < currentOrder;
        const isLast = index === PIPELINE_STAGES.length - 1;

        return (
          <div key={stage} className="flex items-center flex-1 last:flex-none">
            {/* Stage dot / icon */}
            <div className="relative group">
              <div
                className={`flex items-center justify-center rounded-full transition-all ${
                  isActive
                    ? `w-8 h-8 ${config.bgColor} ${config.borderColor} border-2 ring-2 ring-offset-1 ring-${config.color.replace('text-', '')}/30`
                    : isPast
                      ? 'w-6 h-6 bg-emerald-100 border border-emerald-300'
                      : 'w-6 h-6 bg-gray-100 border border-gray-300'
                }`}
              >
                {isPast ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : isActive ? (
                  <div className={`w-2.5 h-2.5 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                )}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {config.label}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mx-1 ${
                  isPast && !isCancelled ? 'bg-emerald-300' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}

      {/* Cancelled indicator */}
      {isCancelled && (
        <div className="ml-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-red-700">Cancelled</span>
        </div>
      )}
    </div>
  );
}
