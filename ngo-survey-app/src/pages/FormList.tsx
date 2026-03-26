import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllForms } from '../lib/db';
import { Header } from '../components/common/Header';
import { BottomNav } from '../components/common/BottomNav';
import { EmptyState } from '../components/common/EmptyState';
import type { SurveyForm } from '../types';

export function FormList() {
  const [forms, setForms] = useState<SurveyForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllForms().then((f) => {
      setForms(f.filter((form) => form.status === 'published'));
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-surface pb-20">
      <Header title="Surveys" />

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
          </div>
        ) : forms.length === 0 ? (
          <EmptyState
            title="No surveys available"
            description="Surveys will appear here once an admin publishes them."
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-3">
            {forms.map((form) => (
              <Link
                key={form.id}
                to={`/forms/${form.id}`}
                className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-800 truncate">
                      {form.title}
                    </h3>
                    {form.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {form.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">
                        v{form.version}
                      </span>
                      <span className="text-xs text-gray-400">
                        {form.schema.fields.filter(f => f.type !== 'section_header').length} fields
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
