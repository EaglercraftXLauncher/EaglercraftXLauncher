import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const AuthErrorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const message = searchParams.get('error') ?? 'Authentication failed.';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Authentication Error</h1>
          <p>{message}</p>
        </div>
        <Link className="auth-btn" to="/login">
          Back to sign in
        </Link>
      </div>
    </div>
  );
};

export default AuthErrorPage;
