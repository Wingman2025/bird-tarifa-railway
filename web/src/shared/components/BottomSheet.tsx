import { useEffect, useId, useRef } from 'react';
import type { PropsWithChildren } from 'react';

type BottomSheetProps = PropsWithChildren<{
  open: boolean;
  title?: string;
  ariaLabel?: string;
  onClose: () => void;
}>;

function focusFirstDescendant(container: HTMLElement) {
  const focusable = container.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  focusable?.focus();
}

export function BottomSheet({
  open,
  title,
  ariaLabel,
  onClose,
  children,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const raf = window.requestAnimationFrame(() => focusFirstDescendant(panel));
    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="sheet-overlay sheet-overlay--open"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <header className="sheet__header">
          {title ? (
            <h2 id={titleId} className="sheet__title">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="sheet__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6l-12 12" />
            </svg>
          </button>
        </header>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}

