import { useSearchParams, Link } from 'react-router-dom';

const MESSAGES: Record<string, string> = {
  invalid_state:  'OAuth state mismatch — please try again.',
  token_failed:   'Could not exchange the OAuth token.',
  profile_failed: 'Could not fetch your profile from the provider.',
  no_email:       'No verified email returned by GitHub. Please add a public email to your GitHub account.',
};

export default function AuthErrorPage() {
  const [sp] = useSearchParams();
  const code = sp.get('msg') ?? 'unknown';
  return (
    <div className="error-page">
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h1>Sign-in failed</h1>
      <p>{MESSAGES[code] ?? `Unexpected error (${code}).`}</p>
      <Link to="/login" className="btn btn-primary" style={{ marginTop: 8 }}>Try again</Link>
    </div>
  );
}
