import { useT } from '../i18n/languageContext';

export function ActivityEditor({
  name,
  startInput,
  startInvalid,
  startError,
  onNameChange,
  onStartChange,
}: {
  name: string;
  startInput: string;
  startInvalid: boolean;
  startError: string;
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
          className={startInvalid ? 'input-danger' : undefined}
          aria-invalid={startInvalid}
          value={startInput}
          onChange={(e) => onStartChange(e.target.value)}
        />
        {startInvalid && (
          <p className="field-error" role="alert">
            {startError}
          </p>
        )}
      </label>
    </div>
  );
}
