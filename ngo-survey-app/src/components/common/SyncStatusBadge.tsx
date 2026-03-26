import { useSyncStatus } from '../../hooks/useSyncStatus';

export function SyncStatusBadge() {
  const { isOnline, pendingCount, triggerSync } = useSyncStatus();

  const dotColor = !isOnline
    ? 'bg-gray-400'
    : pendingCount > 0
      ? 'bg-warning'
      : 'bg-success';

  const label = !isOnline
    ? 'Offline'
    : pendingCount > 0
      ? `${pendingCount} pending`
      : 'Synced';

  return (
    <button
      onClick={triggerSync}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-gray-200 text-xs font-medium text-gray-700 active:bg-gray-100 transition-colors"
      title={isOnline ? 'Tap to sync now' : 'No internet connection'}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
      {label}
    </button>
  );
}
