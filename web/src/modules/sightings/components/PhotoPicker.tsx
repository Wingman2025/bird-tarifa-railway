import { useRef } from 'react';
import type { ChangeEvent } from 'react';

type PhotoPickerProps = {
  file: File | null;
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

export function PhotoPicker({
  file,
  previewUrl,
  onFileChange,
  disabled = false,
}: PhotoPickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const pickFromCamera = () => {
    cameraInputRef.current?.click();
  };

  const pickFromFiles = () => {
    uploadInputRef.current?.click();
  };

  const handleSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    onFileChange(selected);
    event.currentTarget.value = '';
  };

  return (
    <div className="photo-picker">
      <p className="field-label">Foto del avistamiento</p>
      <div className="photo-picker__actions">
        <button
          type="button"
          className="btn btn--soft"
          onClick={pickFromCamera}
          disabled={disabled}
        >
          Tomar foto
        </button>
        <button
          type="button"
          className="btn btn--soft"
          onClick={pickFromFiles}
          disabled={disabled}
        >
          Subir archivo
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleSelection}
        hidden
      />

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleSelection}
        hidden
      />

      {previewUrl ? (
        <div className="photo-picker__preview">
          <img src={previewUrl} alt="Previsualizacion de foto seleccionada" />
          <div className="photo-picker__preview-meta">
            <span>{file?.name || 'Imagen seleccionada'}</span>
            <button
              type="button"
              className="btn btn--link"
              onClick={() => onFileChange(null)}
              disabled={disabled}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <p className="photo-picker__hint">Sin foto seleccionada.</p>
      )}
    </div>
  );
}
