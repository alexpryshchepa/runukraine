export function FileDrop({
  onFile,
  accept = '.tcx',
  label = 'Choose a .tcx file',
}: {
  onFile: (text: string, filename: string) => void;
  accept?: string;
  label?: string;
}) {
  async function handle(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    onFile(text, file.name);
  }
  return (
    <div className="file-drop">
      <label>
        {label}
        <input
          type="file"
          accept={accept}
          onChange={(e) => handle(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
