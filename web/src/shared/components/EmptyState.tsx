type EmptyStateProps = {
  title: string;
  subtitle?: string;
};

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {subtitle ? <p className="empty-state__subtitle">{subtitle}</p> : null}
    </div>
  );
}
