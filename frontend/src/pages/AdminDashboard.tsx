import { useEffect, useState } from 'react';
import { formService, responseService } from '../api/services';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalForms: 0, totalResponses: 0 });
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    // Mock dashboard metrics fetching
    const fetchDashboard = async () => {
      try {
        const formsData = await formService.getForms();
        const resData = await responseService.getResponses();
        
        setStats({
          totalUsers: 5,
          totalForms: formsData.length,
          totalResponses: resData.length
        });
        setResponses(resData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboard();
  }, []);

  const chartData = {
    labels: ['Pending', 'Completed', 'Processing'],
    datasets: [{
      label: 'Survey Completion',
      data: [12, stats.totalResponses, 3],
      backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)'],
      borderRadius: 6,
    }]
  };

  return (
    <div className="animate-fade-in">
      <h1 className="mb-8">Admin Dashboard</h1>

      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-title">Total Surveys Forms</span>
          <span className="stat-value">{stats.totalForms}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-title">Total Responses</span>
          <span className="stat-value">{stats.totalResponses}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-title">Active Field Workers</span>
          <span className="stat-value">{stats.totalUsers}</span>
        </div>
      </div>

      <div className="card mb-8">
        <h3 className="mb-4">Survey Progression</h3>
        <div style={{ height: '300px' }}>
          <Bar 
            data={chartData} 
            options={{ 
              maintainAspectRatio: false, 
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }} 
          />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4">Recent Responses</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Survey ID</th>
                <th>Submitted By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {responses.slice(0, 5).map(res => (
                <tr key={res.id}>
                  <td>{res.id.substring(0, 8)}</td>
                  <td>{res.formId}</td>
                  <td>{res.userId}</td>
                  <td>{new Date(res.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {responses.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center" style={{ color: 'var(--text-muted)' }}>
                    No responses yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
