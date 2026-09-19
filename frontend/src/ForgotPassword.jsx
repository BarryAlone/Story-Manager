import { useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch, initializeCsrf, readJson } from './api';
import authStyles from './authStyles';
import logoIcon from './assets/icons/logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setMessage('');
    setIsSuccess(false);

    try {
      await initializeCsrf();
      const response = await apiFetch('/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await readJson(response);

      if (!response.ok) {
        setErrors(payload?.errors || {});
        setMessage(payload?.message || 'Nie udało się wysłać wiadomości.');
        return;
      }

      setIsSuccess(true);
      setMessage(payload?.message || 'Jeśli konto istnieje, wiadomość została wysłana.');
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
        <h1 style={authStyles.title}>Odzyskaj hasło</h1>
        <p style={authStyles.description}>
          Podaj adres e-mail. Jeśli jest powiązany z kontem, otrzymasz link do ustawienia nowego hasła.
        </p>

        {message && (
          <div role={isSuccess ? 'status' : 'alert'} style={isSuccess ? authStyles.success : authStyles.alert}>
            {message}
          </div>
        )}

        <label htmlFor="forgot-email" style={authStyles.label}>E-mail</label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          disabled={isSubmitting}
          style={authStyles.input}
        />
        {errors.email?.map((error) => <span key={error} style={authStyles.error}>{error}</span>)}

        <button type="submit" disabled={isSubmitting} style={{ ...authStyles.button, marginTop: '20px' }}>
          {isSubmitting ? 'Wysyłanie…' : 'Wyślij link resetujący'}
        </button>

        <p style={authStyles.switchForm}>
          <Link to="/login" style={authStyles.link}>Wróć do logowania</Link>
        </p>
      </form>
    </main>
  );
}
