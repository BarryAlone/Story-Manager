import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiFetch, initializeCsrf, readJson } from './api';
import useAuth from './useAuth';
import './Account.css';

function FieldErrors({ errors = [] }) {
  if (!errors.length) return null;

  return errors.map((error) => (
    <span className="account-form__error" key={error}>{error}</span>
  ));
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser, clearUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileErrors, setProfileErrors] = useState({});
  const [profileMessage, setProfileMessage] = useState('');
  const [profileSucceeded, setProfileSucceeded] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordSucceeded, setPasswordSucceeded] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState({});
  const [deleteMessage, setDeleteMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const submitProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileErrors({});
    setProfileMessage('');
    setProfileSucceeded(false);

    try {
      await initializeCsrf();
      const response = await apiFetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const payload = await readJson(response);

      if (!response.ok) {
        setProfileErrors(payload?.errors || {});
        setProfileMessage(payload?.message || 'Nie udało się zapisać danych profilu.');
        return;
      }

      await refreshUser();
      setProfileSucceeded(true);
      setProfileMessage('Dane profilu zostały zapisane.');
    } catch (error) {
      setProfileMessage(error instanceof Error
        ? error.message
        : 'Nie udało się połączyć z serwerem. Spróbuj ponownie.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const clearPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setPasswordConfirmation('');
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setIsSavingPassword(true);
    setPasswordErrors({});
    setPasswordMessage('');
    setPasswordSucceeded(false);

    try {
      await initializeCsrf();
      const response = await apiFetch('/api/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: passwordConfirmation,
        }),
      });
      const payload = await readJson(response);

      if (!response.ok) {
        setPasswordErrors(payload?.errors || {});
        setPasswordMessage(payload?.message || 'Nie udało się zmienić hasła.');
        clearPasswordFields();
        return;
      }

      clearPasswordFields();
      setPasswordSucceeded(true);
      setPasswordMessage('Hasło zostało zmienione.');
    } catch (error) {
      clearPasswordFields();
      setPasswordMessage(error instanceof Error
        ? error.message
        : 'Nie udało się połączyć z serwerem. Spróbuj ponownie.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const closeDeletionConfirmation = () => {
    if (isDeleting) return;

    setIsConfirmingDeletion(false);
    setDeletePassword('');
    setDeleteConfirmed(false);
    setDeleteErrors({});
    setDeleteMessage('');
  };

  const submitDeletion = async (event) => {
    event.preventDefault();

    if (!deleteConfirmed) return;

    setIsDeleting(true);
    setDeleteErrors({});
    setDeleteMessage('');

    try {
      await initializeCsrf();
      const response = await apiFetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const payload = await readJson(response);

      if (!response.ok) {
        setDeleteErrors(payload?.errors || {});
        setDeleteMessage(payload?.message || 'Nie udało się usunąć konta.');
        setDeletePassword('');
        return;
      }

      clearUser();
      navigate('/login', { replace: true });
    } catch (error) {
      setDeletePassword('');
      setDeleteMessage(error instanceof Error
        ? error.message
        : 'Nie udało się połączyć z serwerem. Spróbuj ponownie.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="account-page" aria-labelledby="profile-heading">
      <header className="account-page__header">
        <p className="account-page__eyebrow">Ustawienia konta</p>
        <h1 id="profile-heading">Profil</h1>
        <p>Zarządzaj danymi logowania i swoim kontem Story Manager.</p>
      </header>

      <div className="account-page__sections">
        <section className="account-card" aria-labelledby="profile-data-heading">
          <h2 id="profile-data-heading">Dane profilu</h2>
          <p className="account-card__description">Zaktualizuj nazwę wyświetlaną i adres e-mail.</p>

          <form className="account-form" onSubmit={submitProfile}>
            {profileMessage && (
              <div
                className={`account-message ${profileSucceeded ? 'account-message--success' : 'account-message--error'}`}
                role={profileSucceeded ? 'status' : 'alert'}
              >
                {profileMessage}
              </div>
            )}

            <label htmlFor="profile-name">Nazwa</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              disabled={isSavingProfile}
            />
            <FieldErrors errors={profileErrors.name} />

            <label htmlFor="profile-email">E-mail</label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={isSavingProfile}
            />
            <FieldErrors errors={profileErrors.email} />

            <button className="account-button" type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? 'Zapisywanie…' : 'Zapisz profil'}
            </button>
          </form>
        </section>

        <section className="account-card" aria-labelledby="password-heading">
          <h2 id="password-heading">Zmiana hasła</h2>
          <p className="account-card__description">Użyj długiego, unikalnego hasła, którego nie stosujesz w innych serwisach.</p>

          <form className="account-form" onSubmit={submitPassword}>
            {passwordMessage && (
              <div
                className={`account-message ${passwordSucceeded ? 'account-message--success' : 'account-message--error'}`}
                role={passwordSucceeded ? 'status' : 'alert'}
              >
                {passwordMessage}
              </div>
            )}

            <label htmlFor="current-password">Aktualne hasło</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={isSavingPassword}
            />
            <FieldErrors errors={passwordErrors.current_password} />

            <label htmlFor="new-password">Nowe hasło</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              required
              disabled={isSavingPassword}
            />
            <FieldErrors errors={passwordErrors.password} />

            <label htmlFor="new-password-confirmation">Potwierdź nowe hasło</label>
            <input
              id="new-password-confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              autoComplete="new-password"
              required
              disabled={isSavingPassword}
            />
            <FieldErrors errors={passwordErrors.password_confirmation} />

            <button className="account-button" type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? 'Zmienianie…' : 'Zmień hasło'}
            </button>
          </form>
        </section>

        <section className="account-card account-card--danger" aria-labelledby="delete-account-heading">
          <h2 id="delete-account-heading">Usuń konto</h2>
          <p className="account-card__description">
            Usunięcie konta jest trwałe i obejmuje należące do niego dane.
          </p>

          {!isConfirmingDeletion ? (
            <button
              className="account-button account-button--danger"
              type="button"
              onClick={() => setIsConfirmingDeletion(true)}
            >
              Usuń konto
            </button>
          ) : (
            <form className="account-form account-form--confirmation" onSubmit={submitDeletion}>
              <h3>Potwierdź trwałe usunięcie konta</h3>
              <p>Tej operacji nie można cofnąć. Podaj aktualne hasło i zaznacz potwierdzenie.</p>

              {deleteMessage && (
                <div className="account-message account-message--error" role="alert">
                  {deleteMessage}
                </div>
              )}

              <label htmlFor="delete-password">Aktualne hasło</label>
              <input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                autoComplete="current-password"
                required
                autoFocus
                disabled={isDeleting}
              />
              <FieldErrors errors={deleteErrors.password} />

              <label className="account-form__check">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(event) => setDeleteConfirmed(event.target.checked)}
                  disabled={isDeleting}
                />
                Rozumiem, że konto i jego dane zostaną trwale usunięte.
              </label>

              <div className="account-form__actions">
                <button type="button" className="account-button account-button--secondary" onClick={closeDeletionConfirmation} disabled={isDeleting}>
                  Anuluj
                </button>
                <button type="submit" className="account-button account-button--danger" disabled={isDeleting || !deleteConfirmed}>
                  {isDeleting ? 'Usuwanie…' : 'Usuń konto na zawsze'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}
