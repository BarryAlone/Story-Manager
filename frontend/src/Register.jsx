import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import authStyles from './authStyles';
import useAuth from './useAuth';
import logoIcon from './assets/icons/logo.png';

export default function Register() {
  const { user, isLoading, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  if (isLoading) {
    return <div style={authStyles.centered}>Sprawdzanie sesji...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const clearPasswords = () => {
    setPassword('');
    setPasswordConfirmation('');
  };

  const submit = async event => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setMessage('');

    try {
      const result = await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      if (!result.ok) {
        setErrors(result.errors);
        setMessage(result.message);
        clearPasswords();
        return;
      }

      navigate('/', { replace: true });
    } catch (error) {
      clearPasswords();
      setMessage(error instanceof Error
        ? error.message
        : 'Nie udało się połączyć z serwerem. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={authStyles.page}>
      <form onSubmit={submit} style={authStyles.form} noValidate>
        <img src={logoIcon} alt="Story Manager" style={authStyles.logo} />
        <h1 style={authStyles.title}>Utwórz konto</h1>

        {message && <div role="alert" style={authStyles.alert}>{message}</div>}

        <label htmlFor="name" style={authStyles.label}>Nazwa</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          autoComplete="name"
          required
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.name)}
          style={authStyles.input}
        />
        {errors.name?.map(error => <span key={error} style={authStyles.error}>{error}</span>)}

        <label htmlFor="email" style={authStyles.label}>E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoComplete="username"
          required
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          style={authStyles.input}
        />
        {errors.email?.map(error => <span key={error} style={authStyles.error}>{error}</span>)}

        <label htmlFor="password" style={authStyles.label}>Hasło</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.password)}
          style={authStyles.input}
        />
        {errors.password?.map(error => <span key={error} style={authStyles.error}>{error}</span>)}

        <label htmlFor="password_confirmation" style={authStyles.label}>Potwierdź hasło</label>
        <input
          id="password_confirmation"
          type="password"
          value={passwordConfirmation}
          onChange={event => setPasswordConfirmation(event.target.value)}
          autoComplete="new-password"
          required
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.password_confirmation)}
          style={authStyles.input}
        />
        {errors.password_confirmation?.map(error => <span key={error} style={authStyles.error}>{error}</span>)}

        <button type="submit" disabled={isSubmitting} style={{ ...authStyles.button, marginTop: '20px' }}>
          {isSubmitting ? 'Tworzenie konta...' : 'Zarejestruj się'}
        </button>

        <p style={authStyles.switchForm}>
          Masz już konto? <Link to="/login" style={authStyles.link}>Zaloguj się</Link>
        </p>
      </form>
    </main>
  );
}
