import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { apiFetch, initializeCsrf, readJson } from './api';
import authStyles from './authStyles';
import logoIcon from './assets/icons/logo.png';

export default function ResetPassword() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearPasswords = () => {
    setPassword('');
    setPasswordConfirmation('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setMessage('');
    setIsSuccess(false);

    try {
      await initializeCsrf();
      const response = await apiFetch('/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      const payload = await readJson(response);

      if (!response.ok) {
        setErrors(payload?.errors || {});
        setMessage(payload?.message || 'Nie udało się ustawić nowego hasła.');
        clearPasswords();
        return;
      }

      clearPasswords();
      setIsSuccess(true);
      setMessage(payload?.message || 'Hasło zostało ustawione. Możesz się teraz zalogować.');
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
      <form onSubmit={submit} style={authStyles.form}>
        <img src={logoIcon} alt="Story Manager" style={authStyles.logo} />
        <h1 style={authStyles.title}>Ustaw nowe hasło</h1>

        {message && (
          <div role={isSuccess ? 'status' : 'alert'} style={isSuccess ? authStyles.success : authStyles.alert}>
            {message}
          </div>
        )}

        <label htmlFor="reset-email" style={authStyles.label}>E-mail</label>
        <input
          id="reset-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
          disabled={isSubmitting || isSuccess}
          style={authStyles.input}
        />
        {errors.email?.map((error) => <span key={error} style={authStyles.error}>{error}</span>)}

        <label htmlFor="reset-password" style={authStyles.label}>Nowe hasło</label>
        <input
          id="reset-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          disabled={isSubmitting || isSuccess}
          style={authStyles.input}
        />
        {errors.password?.map((error) => <span key={error} style={authStyles.error}>{error}</span>)}

        <label htmlFor="reset-password-confirmation" style={authStyles.label}>Potwierdź nowe hasło</label>
        <input
          id="reset-password-confirmation"
          type="password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          autoComplete="new-password"
          required
          disabled={isSubmitting || isSuccess}
          style={authStyles.input}
        />
        {errors.password_confirmation?.map((error) => <span key={error} style={authStyles.error}>{error}</span>)}

        {!isSuccess && (
          <button type="submit" disabled={isSubmitting} style={{ ...authStyles.button, marginTop: '20px' }}>
            {isSubmitting ? 'Zapisywanie…' : 'Ustaw nowe hasło'}
          </button>
        )}

        <p style={authStyles.switchForm}>
          <Link to="/login" style={authStyles.link}>Wróć do logowania</Link>
        </p>
      </form>
    </main>
  );
}
