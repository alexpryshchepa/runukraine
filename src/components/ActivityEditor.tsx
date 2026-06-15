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
  return (
    <div className="activity-editor">
      <label>
        Activity name
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="My activity"
        />
      </label>
      <label>
        Start time
        <input
          type="datetime-local"
          value={startInput}
          onChange={(e) => onStartChange(e.target.value)}
        />
      </label>
    </div>
  );
}
