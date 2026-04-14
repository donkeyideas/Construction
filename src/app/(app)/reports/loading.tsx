export default function Loading() {
  return (
    <div className="loading-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-bar skeleton-title" />
        <div className="skeleton-bar skeleton-subtitle" />
      </div>
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <div className="skeleton-card skeleton-table" />
    </div>
  );
}
