import { useState, type DragEvent } from 'react';

export function FileDrop({
  onFile,
  accept = '.tcx',
  label = 'Choose a .tcx file',
  title,
  hint,
}: {
  onFile: (text: string, filename: string) => void;
  accept?: string;
  /** Accessible name for the hidden file input. */
  label?: string;
  /** Visible drop-zone heading. */
  title?: string;
  /** Visible drop-zone hint. */
  hint?: string;
}) {
  const [dragging, setDragging] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    onFile(text, file.name);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    void handle(e.dataTransfer.files?.[0]);
  }

  return (
    <div className={`file-drop${dragging ? ' dragging' : ''}`}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V4" />
          <path d="M8 8l4-4 4 4" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        {title && <span className="drop-title">{title}</span>}
        {hint && <span className="drop-hint">{hint}</span>}
        <input
          type="file"
          accept={accept}
          aria-label={label}
          onChange={(e) => handle(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
