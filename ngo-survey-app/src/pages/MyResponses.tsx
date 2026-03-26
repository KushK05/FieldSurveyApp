import { useEffect, useState } from 'react';
import { getAllResponses, getAllForms } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/common/Header';
import { BottomNav } from '../components/common/BottomNav';
import { EmptyState } from '../components/common/EmptyState';
import type { SurveyResponse, SurveyForm } from '../types';

function SyncBadge({ status }: { status: SurveyResponse['sync_status'] }) {
  const config = {
    pending: { color: 'bg-amber-100 text-amber-700', label: 'Pending' },
    syncing: { color: 'bg-blue-100 text-blue-700', label: 'Syncing' },
    synced: { color: 'bg-green-100 text-green-700', label: 'Synced' },
    failed: { color: 'bg-red-100 text-red-700', label: 'Failed' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'synced' ? 'bg-green-500' :
        status === 'pending' ? 'bg-amber-500' :
        status === 'syncing' ? 'bg-blue-500' : 'bg-red-500'
      }`} />
      {config.label}
    </span>
  );
}

export function MyResponses() {
  const { user } = useAuth();
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [formMap, setFormMap] = useState<Record<string, SurveyForm>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllResponses(), getAllForms()]).then(([resps, forms]) => {
      const userResps = resps
        .filter((r) => r.respondent_id === user?.id)
        .sort((a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime());
      setResponses(userResps);

      const map: Record<string, SurveyForm> = {};
      forms.forEach((f) => { map[f.id] = f; });
      setFormMap(map);
      setLoading(false);
    });
  }, [user?.id]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Header title="My Responses" />

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
          </div>
        ) : responses.length === 0 ? (
          <EmptyState
            title="No responses yet"
            description="Fill out a survey to see your responses here."
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-2">
              {responses.length} response{responses.length !== 1 ? 's' : ''}
            </p>
            {responses.map((resp) => {
              const form = formMap[resp.form_id];
              return (
                <div
                  key={resp.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-800 truncate">
                        {form?.title || 'Unknown Survey'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(resp.collected_at)}
                      </p>
                    </div>
                    <SyncBadge status={resp.sync_status} />
                  </div>
                  {resp.location && (
                    <p className="text-xs text-gray-400 mt-2">
                      GPS: {resp.location.lat.toFixed(4)}, {resp.location.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
