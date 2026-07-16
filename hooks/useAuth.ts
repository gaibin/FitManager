import { useCallback, useEffect, useState } from 'react';
import type { User } from '../types';
import { getCurrentUser, logout } from '../services/authService';

const DEV_SKIP_AUTH = import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH === 'true';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (DEV_SKIP_AUTH) {
      setUser({ id: 'dev', username: 'dev', role: 'platform_admin' });
      setIsLoading(false);
      return () => { active = false; };
    }

    void getCurrentUser()
      .then((currentUser) => { if (active) setUser(currentUser); })
      .catch((error) => console.error('[Auth] Session restore failed', error))
      .finally(() => { if (active) setIsLoading(false); });

    return () => { active = false; };
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  const handleLoginSuccess = useCallback((authenticatedUser: User) => {
    setUser(authenticatedUser);
    setIsLoading(false);
  }, []);

  return {
    user,
    setUser,
    isLoggedIn: Boolean(user),
    isLoading,
    isAdmin: DEV_SKIP_AUTH || user?.role === 'platform_admin' || user?.role === 'coach',
    handleLogout,
    handleLoginSuccess,
  };
}
