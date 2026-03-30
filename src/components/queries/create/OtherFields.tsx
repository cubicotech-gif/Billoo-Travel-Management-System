import TextAreaWithCleanup from '../shared/TextAreaWithCleanup';

interface Props {
  details: Record<string, any>;
  onChange: (details: Record<string, any>) => void;
}

export default function OtherFields({ details, onChange }: Props) {
  const description = details.description ?? '';

  return (
    <TextAreaWithCleanup
      label="Description"
      value={description}
      onChange={val => onChange({ ...details, description: val })}
      placeholder="Describe the service requirements..."
      rows={4}
    />
  );
}
