import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
          addToast(`Authentication failed: ${error}`, 'error');
          navigate('/auth');
          return;
        }

        if (token) {
          // Store token in sessionStorage
          sessionStorage.setItem('auth_token', token);

          // Refresh auth state
          await refresh();

          // Redirect to home
          addToast('Login successful!', 'success');
          navigate('/');
        } else {
          addToast('No token received', 'error');
          navigate('/auth');
        }
      } catch (error) {
        console.error('Callback error:', error);
        addToast('Authentication error', 'error');
        navigate('/auth');
      }
    };

    handleCallback();
  }, [searchParams, navigate, refresh, addToast]);

  return (
    <div className="auth-callback-container">
      <div className="loading">Completing authentication...</div>
    </div>
  );
};

export default AuthCallbackPage;