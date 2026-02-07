type AlertBannerProps = {
  kind: 'info' | 'success' | 'error';
  message: string;
};

export function AlertBanner({ kind, message }: AlertBannerProps) {
  return <p className={`alert alert--${kind}`}>{message}</p>;
}
