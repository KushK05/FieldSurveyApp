import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formService, responseService } from '../api/services';
import { savePendingSurvey } from '../lib/db';
import { useSyncStore } from '../store/syncStore';
import { useAuthStore } from '../store/authStore';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function SurveyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const { isOnline, pendingCount, setPendingCount } = useSyncStore();
  
  const [formConfig, setFormConfig] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (id) {
      formService.getFormById(id).then(res => {
        setFormConfig(res);
      }).catch(err => {
        console.error("Failed to fetch form logic offline handling", err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [id]);

  const handleChange = (fieldId: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    
    setSubmitting(true);
    
    const payload = {
      formId: id,
      userId: user.id,
      data: formData,
    };

    try {
      if (isOnline) {
        await responseService.submitResponse(payload);
      } else {
        throw new Error('Offline');
      }
    } catch (err) {
      // Save locally for syncing later
      await savePendingSurvey({
        id: crypto.randomUUID(),
        surveyId: id,
        data: payload,
        timestamp: Date.now()
      });
      setPendingCount(pendingCount + 1);
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => navigate('/'), 2500);
    }
  };

  if (loading) return <div style={{textAlign:'center', marginTop: '5rem'}}>Loading form...</div>;
  if (!formConfig) return <div style={{textAlign:'center', marginTop: '5rem'}}>Form not found.</div>;

  if (submitted) {
    return (
      <div className="card text-center animate-fade-in" style={{ maxWidth: '500px', margin: '4rem auto', padding: '3rem 2rem' }}>
        <CheckCircle size={48} color="var(--accent-success)" style={{ margin: '0 auto 1.5rem' }} />
        <h2 style={{ marginBottom: '1rem' }}>Survey Completed!</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {isOnline ? 'Your response has been submitted directly to the server.' : 'Saved locally! It will be synced when you have an internet connection.'}
        </p>
      </div>
    );
  }

  // Define schema fallback just in case form structure is not strictly nested
  const schema = Array.isArray(formConfig.schema) ? formConfig.schema : [
    { id: '1', type: 'text', label: 'Beneficiary Name', required: true },
    { id: '2', type: 'text', label: 'Location Details', required: true },
    { id: '3', type: 'textarea', label: 'Observations', required: false },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card mb-8">
        <h2 style={{ marginBottom: '0.5rem' }}>{formConfig.title}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{formConfig.description}</p>
        
        {!isOnline && (
          <div className="badge badge-warning flex-between mt-4" style={{ padding: '0.5rem 1rem', width: '100%', borderRadius: 'var(--radius-md)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}><AlertTriangle size={16}/> You are offline. Record will be queued.</span>
          </div>
        )}
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {schema.map((field: any) => (
            <div key={field.id} className="input-container mb-4">
              <label>{field.label} {field.required && <span style={{color: 'var(--accent-danger)'}}>*</span>}</label>
              {field.type === 'textarea' ? (
                <textarea 
                  className="input-field" 
                  rows={4}
                  required={field.required}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              ) : (
                <input 
                  className="input-field" 
                  type={field.type === 'number' ? 'number' : 'text'}
                  required={field.required}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              )}
            </div>
          ))}

          <button 
            type="submit" 
            className="btn btn-primary mt-4" 
            style={{ width: '100%', padding: '0.75rem' }}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Submit Form Data'}
          </button>
        </form>
      </div>
    </div>
  );
}
