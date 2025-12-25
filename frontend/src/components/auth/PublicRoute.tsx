import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect, useState, type JSX } from 'react';
import { Navigate } from 'react-router-dom';

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const refresh = useAuthStore((s) => s.refresh);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Chỉ thử refresh khi chưa có accessToken AND client từng login trước đó
      if (!accessToken && localStorage.getItem('kanban_has_logged_in')) {
        await refresh({ silent: true });
      }

      if (accessToken && !user) {
        await fetchMe({ silent: true });
      }

      if (mounted) setStarting(false);
    })();

    return () => {
      mounted = false;
    };
    // re-run if auth-related values change so we can fetch user or react to token
  }, [accessToken, user, refresh, fetchMe]);

  // Khi đang load hoặc init chưa xong → show loader

  if (starting || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Đang tải trang...
      </div>
    );
  }

  // Nếu đã login → redirect ngay lập tức

  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  // Nếu chưa login → render children
  return children;
};

export default PublicRoute;