import { STAGE_CONFIG, type QueryStage } from '@/types/query';

interface Props {
  stage: QueryStage;
  size?: 'sm' | 'md';
}

export default function StageBadge({ stage, size = 'sm' }: Props) {
  const config = STAGE_CONFIG[stage];
  return (
    <span
      className={`inline-flex items-center rounded-full text-xs font-medium ${config.bgColor} ${config.color} ${
        size === 'md' ? 'text-sm px-3 py-1' : 'px-2.5 py-0.5'
      }`}
    >
      {config.label}
    </span>
  );
}
