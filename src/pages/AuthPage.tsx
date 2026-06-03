import React from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthPage: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.png" alt="Eaglercraft" className="auth-logo" />
          <h1>EagXL Launcher</h1>
          <p>Sign in to your account</p>
        </div>

        <div className="auth-buttons">
          <button
            className="auth-btn auth-btn-google"
            onClick={() => login('google')}
          >
            <span className="icon">🔵</span>
            Sign in with Google
          </button>
          <button
            className="auth-btn auth-btn-github"
            onClick={() => login('github')}
          >
            <span className="icon">⬛</span>
            Sign in with GitHub
          </button>
        </div>

        <div className="auth-footer">
          <p>
            By signing in, you agree to our{' '}
            <a href="/terms">Terms of Service</a> and{' '}
            <a href="/privacy">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;