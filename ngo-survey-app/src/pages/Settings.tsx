import { useAuth } from '../contexts/AuthContext';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { Header } from '../components/common/Header';
import { BottomNav } from '../components/common/BottomNav';

export function Settings() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, triggerSync } = useSyncStatus();

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Header title="Settings" />

      <div className="px-4 py-4 space-y-4">
        {/* User info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {user?.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">{user?.full_name}</h3>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Sync status */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Sync Status</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Connection</span>
            <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Pending uploads</span>
            <span className="text-sm font-medium text-gray-800">{pendingCount}</span>
          </div>
          {pendingCount > 0 && isOnline && (
            <button
              onClick={triggerSync}
              className="w-full py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-medium active:bg-primary/20 transition-colors"
            >
              Sync Now
            </button>
          )}
        </div>

        {/* About */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">About</h3>
          <p className="text-xs text-gray-500">
            FieldSurvey v1.0 — Offline-first survey data collection app for field workers.
            Data syncs automatically when internet is available.
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-3 rounded-xl border-2 border-red-200 text-danger text-sm font-medium active:bg-red-50 transition-colors"
        >
          Log Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
