import { useEffect, useState } from 'react';
import { formService } from '../api/services';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';

export default function UserHome() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    formService.getForms().then(setForms).finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1>Assigned Surveys</h1>
          <p style={{ color: 'var(--text-muted)' }}>Select a survey form below to begin data collection.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading forms...</div>
      ) : forms.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No assigned forms available.</p>
        </div>
      ) : (
        <div className="form-grid">
          {forms.map(form => (
            <div key={form.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ 
                  background: 'var(--primary-light)', 
                  padding: '0.5rem', 
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--primary)'
                }}>
                  <FileText size={20} />
                </div>
                <h3>{form.title}</h3>
              </div>
              
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', flex: 1, fontSize: '0.875rem' }}>
                {form.description || 'Fill out the details for this survey accurately.'}
              </p>
              
              <Link 
                to={`/form/${form.id}`} 
                className="btn btn-primary" 
                style={{ width: '100%', textDecoration: 'none' }}
              >
                Start Survey <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
