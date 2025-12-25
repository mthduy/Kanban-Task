import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import socketService from '@/lib/socket';

const ProtectedRoute = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const refresh = useAuthStore((s) => s.refresh);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Try silent refresh when we don't have an access token AND client previously logged in
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
  }, [accessToken, user, refresh, fetchMe]);

  // Socket connection management
  useEffect(() => {
    if (accessToken && user) {
      // Connect socket when user is authenticated
      socketService.connect();
    } else {
      // Disconnect when user logs out
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [accessToken, user]);

  if (starting || loading) {
    return (
      <div className="flex h-screen items-center justify-center ">
        Đang tải trang...
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace></Navigate>;
  }

  return <Outlet></Outlet>;
};

export default ProtectedRoute;
