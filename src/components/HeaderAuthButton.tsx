import { useState, useEffect, useCallback } from 'react';
import { PUBLIC_API_BASE_URL } from 'astro:env/client';

export default function HeaderAuthButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${PUBLIC_API_BASE_URL}/me`, {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        });
        if (response.status === 200) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        // Not logged in or network error
      }
    };
    checkAuth();
  }, []);

  const handleLogin = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    sessionStorage.setItem('login_redirect', '/user');
    window.location.href = `${PUBLIC_API_BASE_URL}/auth/discord/login`;
  }, []);

  const handleLogout = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await fetch(`${PUBLIC_API_BASE_URL}/auth/logout`, {
        method: 'GET',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setIsLoggedIn(false);
    window.location.href = '/';
  }, []);

  if (isLoggedIn) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        className="button light small"
      >
        logout
      </button>
    );
  }

  return (
    <a
      href="/login?redirect=/user"
      onClick={handleLogin}
      className="button purple small"
    >
      login
    </a>
  );
}
