import { Button } from '../ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

const Logout = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error(error);
    }
  };

  return <Button onClick={handleLogout}>{t('auth.logout')}</Button>;
};

export default Logout;
