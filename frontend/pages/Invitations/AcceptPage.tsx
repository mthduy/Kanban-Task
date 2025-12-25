import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';

const AcceptPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const token = tokenParam || localStorage.getItem('pending_invite_token');
    if (!token) {
      setMessage('Không tìm thấy token lời mời trong đường dẫn.');
      return;
    }

    const doAccept = async () => {
      if (!user) {
        localStorage.setItem('pending_invite_token', token);
        navigate('/login', { state: { from: location } });
        return;
      }

      try {
        const res = await api.post('/invitations/accept', { token });
        const board = res.data.board;
        localStorage.removeItem('pending_invite_token');
        setMessage('Bạn đã được thêm vào board. Chuyển hướng...');
        setTimeout(() => navigate(`/board/${board?._id || board?.id || ''}`), 800);
      } catch (err) {
        const axiosErr = err as { response?: { data?: { message?: string } } } | undefined;
        setMessage(axiosErr?.response?.data?.message || 'Không thể chấp nhận lời mời');
      }
    };

    doAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam, user]);

  return (
    <div className="min-h-svh flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-xl font-bold mb-4">Chấp nhận lời mời</h1>
        {message ? <p className="mb-4">{message}</p> : <p className="mb-4">Đang xử lý...</p>}
        {!user && (
          <p className="text-sm text-muted-foreground">Bạn sẽ được chuyển tới trang đăng nhập để hoàn tất.</p>
        )}
        {user && message && (
          <div className="mt-4">
            <Button onClick={() => navigate('/')}>Về trang chính</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptPage;
