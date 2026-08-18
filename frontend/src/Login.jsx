import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from './useAuth';
import logoIcon from './assets/icons/logo.png';

export default function Login() {
  const { user, isLoading, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  if (isLoading) {
    return <div style={styles.centered}>Sprawdzanie sesji...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const submit = async event => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setMessage('');

    try {
      const result = await login({ email, password, remember });

      if (!result.ok) {
        setErrors(result.errors);
        setMessage(result.message);
        return;
      }

      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (error) {
      setMessage(error instanceof Error
        ? error.message
        : 'Nie udało się połączyć z serwerem. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={styles.page}>
      <form onSubmit={submit} style={styles.form}>
        <img src={logoIcon} alt="Story Manager" style={styles.logo} />
        <h1 style={styles.title}>Zaloguj się</h1>

        {message && <div role="alert" style={styles.alert}>{message}</div>}

        <label htmlFor="email" style={styles.label}>E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoComplete="username"
          required
          disabled={isSubmitting}
          style={styles.input}
        />
        {errors.email?.map(error => <span key={error} style={styles.error}>{error}</span>)}

        <label htmlFor="password" style={styles.label}>Hasło</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          disabled={isSubmitting}
          style={styles.input}
        />
        {errors.password?.map(error => <span key={error} style={styles.error}>{error}</span>)}

        <label style={styles.remember}>
          <input
            type="checkbox"
            checked={remember}
            onChange={event => setRemember(event.target.checked)}
            disabled={isSubmitting}
          />
          Zapamiętaj mnie
        </label>

        <button type="submit" disabled={isSubmitting} style={styles.button}>
          {isSubmitting ? 'Logowanie...' : 'Zaloguj się'}
        </button>
      </form>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '24px',
    backgroundColor: '#f5f6fa',
  },
  centered: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
  },
  form: {
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    padding: '32px',
    borderRadius: '14px',
    backgroundColor: '#fff',
    boxShadow: '0 12px 32px rgba(17, 24, 39, 0.12)',
  },
  logo: { width: '88px', height: '88px', alignSelf: 'center' },
  title: { margin: '0 0 24px', textAlign: 'center', color: '#111827' },
  label: { margin: '14px 0 6px', fontWeight: 600, color: '#374151' },
  input: {
    width: '100%',
    padding: '11px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
  },
  remember: { display: 'flex', gap: '8px', margin: '18px 0', color: '#4b5563' },
  button: {
    padding: '12px 18px',
    border: 0,
    borderRadius: '8px',
    backgroundColor: '#4b5563',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  alert: {
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  error: { marginTop: '5px', color: '#b91c1c', fontSize: '0.875rem' },
};
