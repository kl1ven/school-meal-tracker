import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaultRouteForRole, useAuth } from '../context/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!emailOrPhone.trim() || !password.trim()) {
      setError('Введите email/телефон и пароль.');
      return;
    }

    setIsLoading(true);
    try {
      await login(emailOrPhone.trim(), password.trim());
    } catch (err) {
      setError((err as Error).message || 'Ошибка входа.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>Вход в систему</h1>
          <p className="login-subtitle">Учёт питания в школе</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="emailOrPhone">Email или телефон</label>
              <input
                id="emailOrPhone"
                type="text"
                value={emailOrPhone}
                onChange={(event) => setEmailOrPhone(event.target.value)}
                placeholder="teacher@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Пароль"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="password-input"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  tabIndex={-1}
                >
                  <img
                    src={showPassword ? '/eye.png' : '/hide.png'}
                    alt=""
                    className="eye-icon"
                  />
                </button>
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <div className="login-footer">
            <button
              type="button"
              className="forgot-password"
              onClick={() => setError('Обратитесь к администратору для восстановления пароля.')}
            >
              Забыли пароль?
            </button>
            <p className="no-account">Нет аккаунта? Обратитесь к администратору</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
