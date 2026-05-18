/**
 * 认证状态管理 hook — 统一管理登录状态和用户角色
 * 解决原 isAdmin() 读 localStorage 与 React state 不同步的问题
 */

import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { getCurrentUser, logout } from '../services/authService';

// 开发模式跳过登录（通过环境变量控制）
const DEV_SKIP_AUTH = import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH !== 'false';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 初始化：检查登录状态
  useEffect(() => {
    if (DEV_SKIP_AUTH) {
      setUser({ id: 'dev', username: 'dev', role: 'admin' });
      setIsLoggedIn(true);
      return;
    }
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsLoggedIn(true);
    }
  }, []);

  return {
    user,
    setUser,
    isLoggedIn,
    setIsLoggedIn,
    isAdmin: DEV_SKIP_AUTH || user?.role === 'admin',
    handleLogout,
    handleLoginSuccess,
  };
}
