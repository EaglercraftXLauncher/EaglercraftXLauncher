import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const MESSAGES: Record<string, string> = {
  invalid_state:  'OAuth state mismatch. Please try again.',
  token_failed:   'Could not exchange the OAuth token. Please try again.',
  profile_failed: 'Could not fetch your profile from the provider.',
  no_email:       'No verified email address was returned by GitHub. Please add a public or primary email.',
};

const AuthErrorPage: React.FC = () => {
  const [sp] = useSearchParams();
  const code = sp.get('msg') ?? 'unknown';
  const message = MESSAGES[code] ?? `An unexpected error occurred (${code}).`;

  return (
    <div className="error-page">
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h1>Sign-in failed</h1>
      <p>{message}</p>
      <Link to="/login" className="btn btn-primary" style={{ marginTop: 8 }}>Try again</Link>
    </div>
  );
};

export default AuthErrorPage;
