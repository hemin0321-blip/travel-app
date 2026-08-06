export function ErrorBanner({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <p className="error-banner" role="alert">
      <span>{message}</span>
      {actionLabel && onAction && (
        <button type="button" className="error-banner__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </p>
  );
}
