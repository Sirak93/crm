import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import Cookies from 'js-cookie';
import type { IAppResponse, IAuthUser, ILoginResponse } from 'armstock-shared';
import { UserModel } from '../models/UserModel';
import ApiService from '../services/ApiService';
import { AUTH_COOKIE } from '../constants/constants';
import { AppLogger } from '../utils/AppLogger';

const getCookieOptions = () => ({
  expires: 7,
  sameSite: (window.location.protocol === 'https:' ? 'none' : 'lax') as 'none' | 'lax',
  secure: window.location.protocol === 'https:',
});

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserModel | null>(null);
  const isAuthenticated = computed(() => user.value !== null);

  const login = async (email: string, password: string) => {
    const response = await ApiService.post<IAppResponse<ILoginResponse>>('/auth/login', { email, password });
    const { user: userData, token, refreshToken } = response.data.data!;

    const cookieOptions = getCookieOptions();
    Cookies.set(AUTH_COOKIE.TOKEN, token, cookieOptions);
    Cookies.set(AUTH_COOKIE.REFRESH_TOKEN, refreshToken, cookieOptions);
    user.value = UserModel.fromJSON(userData);
  };

  const logout = async () => {
    try {
      if (isAuthenticated.value) {
        await ApiService.post('/auth/logout');
      }
    } catch (error) {
      AppLogger.error('Logout API failed', error);
    } finally {
      clearSession();
    }
  };

  // Local only, no logout call - used when the backend session is already gone.
  const clearSession = () => {
    user.value = null;
    const cookieOptions = getCookieOptions();
    Cookies.remove(AUTH_COOKIE.TOKEN, cookieOptions);
    Cookies.remove(AUTH_COOKIE.REFRESH_TOKEN, cookieOptions);
  };

  /** Restores the session from the cookies on app start. */
  const init = async () => {
    if (!Cookies.get(AUTH_COOKIE.TOKEN)) return;

    try {
      const response = await ApiService.get<IAppResponse<{ user: IAuthUser }>>('/auth/user');
      user.value = UserModel.fromJSON(response.data.data!.user);
    } catch (error) {
      AppLogger.error('Failed to restore the session', error);
      clearSession();
    }
  };

  const updateAccessToken = (newToken: string) => {
    Cookies.set(AUTH_COOKIE.TOKEN, newToken, getCookieOptions());
  };

  return {
    user,
    isAuthenticated,
    login,
    logout,
    clearSession,
    init,
    updateAccessToken,
  };
});
