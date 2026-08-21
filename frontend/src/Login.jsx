import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import authStyles from './authStyles';
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
    return <div style={authStyles.centered}>Sprawdzanie sesji...</div>;
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
    <main style={authStyles.page}>
      <form onSubmit={submit} style={authStyles.form}>
        <img src={logoIcon} alt="Story Manager" style={authStyles.logo} />
        <h1 style={authStyles.title}>Zaloguj się</h1>

        {message && <div role="alert" style={authStyles.alert}>{message}</div>}

        <label htmlFor="email" style={authStyles.label}>E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoComplete="username"
          required
          disabled={isSubmitting}
          style={authStyles.input}
        />
        {errors.email?.map(error => <span key={error} style={authStyles.error}>{error}</span>)}

        <label htmlFor="password" style={authStyles.label}>Hasło</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          disabled={isSubmitting}
          style={authStyles.input}
        />
        {errors.password?.map(error => <span key={error} style={authStyles.error}>{error}</span>)}

        <label style={authStyles.remember}>
          <input
            type="checkbox"
            checked={remember}
            onChange={event => setRemember(event.target.checked)}
            disabled={isSubmitting}
          />
          Zapamiętaj mnie
        </label>

        <button type="submit" disabled={isSubmitting} style={authStyles.button}>
          {isSubmitting ? 'Logowanie...' : 'Zaloguj się'}
        </button>

        <p style={authStyles.switchForm}>
          Nie masz konta? <Link to="/register" style={authStyles.link}>Zarejestruj się</Link>
        </p>
      </form>
    </main>
  );
}
