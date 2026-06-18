import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const msg   = searchParams.get('msg') ?? searchParams.get('error');
    if (msg) { navigate(`/auth/error?msg=${encodeURIComponent(msg)}`); return; }
    if (token) {
      sessionStorage.setItem('auth_token', token);
      refresh().then(() => navigate('/', { replace: true }));
    } else {
      navigate('/login', { replace: true });
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'var(--text2)', fontFamily: 'var(--font-body)' }}>Signing you in…</p>
    </div>
  );
}
