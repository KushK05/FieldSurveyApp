import { useNavigate, useLocation } from 'react-router-dom';
import { SyncStatusBadge } from './SyncStatusBadge';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export function Header({ title = 'FieldSurvey', showBack = false }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/forms';

  return (
    <header className="sticky top-0 z-40 bg-primary text-white shadow-md">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {showBack && !isHome && (
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
              aria-label="Go back"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </div>
        <SyncStatusBadge />
      </div>
    </header>
  );
}
