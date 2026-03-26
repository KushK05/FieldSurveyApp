import { useEffect, useState } from 'react';
import { useSyncStore } from '../store/syncStore';
import { getPendingSurveys, removePendingSurvey } from '../lib/db';
import { responseService } from '../api/services';
import { CloudOff, RefreshCw, CheckCircle } from 'lucide-react';

export default function SyncStatus() {
  const { isOnline, pendingCount, setPendingCount, isSyncing, setSyncing } = useSyncStore();
  const [offlineRecords, setOfflineRecords] = useState<any[]>([]);

  const loadPending = async () => {
    const queue = await getPendingSurveys();
    setOfflineRecords(queue);
    setPendingCount(queue.length);
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleSync = async () => {
    if (!isOnline || offlineRecords.length === 0) return;
    
    setSyncing(true);
    let success = 0;
    
    for (const record of offlineRecords) {
      try {
        await responseService.submitResponse(record.data);
        await removePendingSurvey(record.id);
        success++;
      } catch (err) {
        console.error('Failed to sync record', record.id, err);
      }
    }
    
    setSyncing(false);
    await loadPending();
    
    if (success > 0) {
      alert(`Successfully synced ${success} records`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="mb-8">Sync Status</h1>

      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', marginBottom: '2rem' }}>
        {pendingCount === 0 ? (
          <div>
            <CheckCircle size={64} color="var(--accent-success)" style={{ margin: '0 auto 1.5rem' }} />
            <h2>All Caught Up!</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>There are no offline surveys waiting to be synced to the server.</p>
          </div>
        ) : (
          <div>
            <CloudOff size={64} color="var(--accent-warning)" style={{ margin: '0 auto 1.5rem' }} />
            <h2>{pendingCount} Pending Record{pendingCount !== 1 && 's'}</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '2rem' }}>
              These records were captured while you were offline.
            </p>
            
            <button 
              className="btn btn-primary"
              onClick={handleSync}
              disabled={!isOnline || isSyncing}
              style={{ padding: '0.75rem 2rem' }}
            >
              <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} /> 
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            {!isOnline && (
              <p style={{ color: 'var(--accent-danger)', fontSize: '0.875rem', marginTop: '1rem' }}>
                You must be online to sync records.
              </p>
            )}
          </div>
        )}
      </div>

      {offlineRecords.length > 0 && (
        <div className="card">
          <h3 className="mb-4">Queue Details</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Queue ID</th>
                  <th>Survey App</th>
                  <th>Data Length</th>
                  <th>Saved At</th>
                </tr>
              </thead>
              <tbody>
                {offlineRecords.map(record => (
                  <tr key={record.id}>
                    <td>{record.id.substring(0, 8)}</td>
                    <td>{record.surveyId}</td>
                    <td>{Object.keys(record.data.data || {}).length} fields</td>
                    <td>{new Date(record.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
