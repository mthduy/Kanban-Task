import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import DashBoardPage from '../pages/DashBoard/DashBoardPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import { Toaster } from 'sonner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AcceptPage from '../pages/Invitations/AcceptPage';
import NotFound from '../pages/NotFound';
import PublicRoute from './components/auth/PublicRoute';
import ErrorBoundary from './components/ErrorBoundary';

const BoardPage = lazy(() => import('../pages/Board/BoardPage'));
const CardModal = lazy(() => import('../pages/Board/CardModal'));

function App() {
  return (
    <ErrorBoundary>
      <Toaster 
        richColors 
        position="bottom-right"
        expand={true}
      />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashBoardPage />} />
            <Route path="/workspace/:id" element={<DashBoardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/board/:id" element={
              <Suspense fallback={<div style={{padding:16}}>Đang tải board...</div>}>
                <BoardPage />
              </Suspense>
            }>
              <Route path="card/:cardId" element={
                <Suspense fallback={<div style={{padding:16}}>Đang tải thẻ...</div>}>
                  <CardModal />
                </Suspense>
              } />
            </Route>
            {/* Support direct access to card modal URL by rendering BoardPage which will show CardModal when cardId param exists */}
            <Route path="/board/:id/card/:cardId" element={
              <Suspense fallback={<div style={{padding:16}}>Đang tải board...</div>}>
                <BoardPage />
              </Suspense>
            } />
          </Route>
          <Route path="/invitations/accept" element={<AcceptPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
