import { useT } from '../i18n/languageContext';

export function ActivityEditor({
  name,
  startInput,
  onNameChange,
  onStartChange,
}: {
  name: string;
  startInput: string;
  onNameChange: (v: string) => void;
  onStartChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <div className="activity-editor">
      <label>
        {t('activityName')}
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('activityNamePlaceholder')}
        />
      </label>
      <label>
        {t('startTime')}
        <input
          type="datetime-local"
          value={startInput}
          onChange={(e) => onStartChange(e.target.value)}
        />
      </label>
    </div>
  );
}
