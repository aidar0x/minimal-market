import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register';

function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Куда вернуть после входа
  const from =
    (location.state as { from?: string } | null)?.from ?? '/';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setInfo('');

    if (!email.trim()) {
      setError('Укажите почту.');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов.');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        navigate(from, { replace: true });
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password);

        if (needsConfirmation) {
          setInfo('Мы отправили письмо. Подтвердите почту и войдите.');
          setMode('login');
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Что-то пошло не так.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setInfo('');
  };

  return (
    <section className="simple-page">
      <p className="eyebrow">
        {mode === 'login' ? 'ВХОД' : 'РЕГИСТРАЦИЯ'}
      </p>
      <h1>{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</h1>

      <form className="sell-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Почта</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
          />
        </label>

        <label className="form-field">
          <span>Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Не короче 6 символов"
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {info && <p className="form-info">{info}</p>}

        <button
          className="primary-button"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? 'Подождите...'
            : mode === 'login'
              ? 'Войти'
              : 'Зарегистрироваться'}
        </button>

        <button type="button" className="text-button" onClick={switchMode}>
          {mode === 'login'
            ? 'Нет аккаунта? Зарегистрироваться'
            : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </section>
  );
}

export default AuthPage;