import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getForm, saveResponse, addToSyncQueue } from '../lib/db';
import { createSyncQueueItem } from '../lib/sync';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineForm } from '../hooks/useOfflineForm';
import { Header } from '../components/common/Header';
import { SurveyRenderer } from '../components/SurveyRenderer/SurveyRenderer';
import type { SurveyForm, SurveyResponse } from '../types';

export function FillForm() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [response, setResponse] = useState<SurveyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!formId) return;

    getForm(formId).then((f) => {
      if (f) {
        setForm(f);
        const newResponse: SurveyResponse = {
          id: uuidv4(),
          form_id: f.id,
          form_version: f.version,
          respondent_id: user?.id || 'unknown',
          data: {},
          location: null,
          collected_at: new Date().toISOString(),
          synced_at: null,
          device_id: navigator.userAgent.slice(0, 50),
          sync_status: 'pending',
        };
        setResponse(newResponse);
      }
      setLoading(false);
    });
  }, [formId, user?.id]);

  const getData = useCallback(() => response?.data || {}, [response?.data]);
  useOfflineForm(response, getData);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!response || !form) return;

    const finalResponse: SurveyResponse = {
      ...response,
      data,
      collected_at: new Date().toISOString(),
      sync_status: 'pending',
    };

    await saveResponse(finalResponse);
    await addToSyncQueue(createSyncQueueItem('response', finalResponse.id));

    setSubmitted(true);
  };

  const handleSaveDraft = async (data: Record<string, unknown>) => {
    if (!response) return;

    const draft: SurveyResponse = {
      ...response,
      data,
      sync_status: 'pending',
    };

    await saveResponse(draft);
    // Don't add to sync queue — drafts stay local
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Header title="Loading..." showBack />
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
          </svg>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-surface">
        <Header title="Not Found" showBack />
        <div className="px-4 py-20 text-center">
          <p className="text-gray-500">This survey could not be found.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface">
        <Header title="Submitted" showBack />
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Response Saved!</h2>
          <p className="text-sm text-gray-500 mb-8 max-w-xs">
            Your response has been saved and will sync automatically when you're online.
          </p>
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={() => navigate(`/forms/${form.id}`)}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-primary text-primary font-medium text-sm"
            >
              Fill Another
            </button>
            <button
              onClick={() => navigate('/forms')}
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-sm"
            >
              All Surveys
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header title={form.title} showBack />
      <SurveyRenderer
        schema={form.schema}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}
