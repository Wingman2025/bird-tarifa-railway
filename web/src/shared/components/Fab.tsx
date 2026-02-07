type FabProps = {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export function Fab({
  onClick,
  disabled = false,
  ariaLabel = 'Nuevo avistamiento',
}: FabProps) {
  return (
    <button
      type="button"
      className="fab"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </button>
  );
}

