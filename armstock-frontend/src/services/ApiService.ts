import axios, { CanceledError, isAxiosError, isCancel, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { API_PATH, ErrorCodes, type IAppResponse, type IRefreshResponse } from 'armstock-shared';
import { AppLogger, type Logger } from '../utils/AppLogger';
import { AUTH_COOKIE, ROUTE_NAME, TOKEN_REFRESH_MARGIN_SECONDS } from '../constants/constants';
import { tokenExpiresAtMs } from '../utils/tokenExpiry';
import i18n from '../i18n';
import { NotificationService } from './NotificationService';

class ApiService {
  private axiosInstance: AxiosInstance;
  private logger: Logger;
  // The refresh in progress: every request that gets a 401 meanwhile waits for this one.
  private refreshing: Promise<string | null> | null = null;

  constructor() {
    this.logger = AppLogger.child('API');
    this.axiosInstance = axios.create({
      baseURL: `${import.meta.env.VITE_BACKEND_HOST}${API_PATH}`,
      headers: {
        'Content-Type': 'application/json',
        // Dev testing through an ngrok tunnel.
        'ngrok-skip-browser-warning': 'true',
      },
    });

    // The token is read from the cookie on every request: a default set once at login is
    // lost on hot reload and goes stale when another tab refreshes the token.
    this.axiosInstance.interceptors.request.use(async (config) => {
      // A failed refresh rejects here too, so the request is not sent.
      await this.ensureFreshToken();
      const token = Cookies.get(AUTH_COOKIE.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Cancelled before it was sent (the session ended) - nothing to retry.
        if (isCancel(error)) return Promise.reject(error);
        const originalRequest = error.config;
        const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');

        // User or company blocked: hard logout, no refresh retry. Only the first of several
        // parallel ones reaches its page, so the user sees one message.
        if (error.response?.status === ErrorCodes.USER.BLOCKED.STATUS) {
          const alreadyEnded = originalRequest.headers.Authorization && !Cookies.get(AUTH_COOKIE.TOKEN);
          await this.endSession();
          return Promise.reject(alreadyEnded ? new CanceledError('Session ended') : error);
        }

        if (error.response?.status === ErrorCodes.AUTH.UNAUTHORIZED.STATUS && !originalRequest._retry && !isRefreshRequest) {
          originalRequest._retry = true;

          // Sent with an old token that was already refreshed meanwhile - retry with the new one.
          const currentToken = Cookies.get(AUTH_COOKIE.TOKEN);
          const newToken = currentToken && originalRequest.headers.Authorization !== `Bearer ${currentToken}`
            ? currentToken
            : await this.refreshAccessToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.axiosInstance(originalRequest);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  private isExpiringSoon(token: string | undefined): boolean {
    if (!token) return false;
    const expiresAt = tokenExpiresAtMs(token);
    return expiresAt !== null && expiresAt - Date.now() < TOKEN_REFRESH_MARGIN_SECONDS * 1000;
  }

  /**
   * New access token from the refresh token; `null` when there is none. Only one refresh
   * runs at a time. A refresh the server refuses ends the session once and rejects every
   * waiting request as cancelled; any other failure (network) keeps the session.
   */
  private refreshAccessToken(): Promise<string | null> {
    if (!this.refreshing) {
      this.refreshing = this.requestNewToken().finally(() => { this.refreshing = null; });
    }
    return this.refreshing;
  }

  private async requestNewToken(): Promise<string | null> {
    // Lazy import: the auth store imports this service.
    const { useAuthStore } = await import('../stores/auth');
    const authStore = useAuthStore();
    const refreshToken = Cookies.get(AUTH_COOKIE.REFRESH_TOKEN);
    if (!refreshToken) return null;

    try {
      this.logger.log('Token expired, attempting refresh...');
      const response = await axios.post<IAppResponse<IRefreshResponse>>(
        `${import.meta.env.VITE_BACKEND_HOST}${API_PATH}/auth/refresh`,
        { refreshToken },
        { headers: { 'ngrok-skip-browser-warning': 'true' } },
      );

      const newToken = response.data.data!.token;
      authStore.updateAccessToken(newToken);
      return newToken;
    } catch (refreshError) {
      this.logger.error('Refresh token failed:', refreshError);
      const status = isAxiosError(refreshError) ? refreshError.response?.status : undefined;
      if (status !== ErrorCodes.AUTH.UNAUTHORIZED.STATUS && status !== ErrorCodes.USER.BLOCKED.STATUS) {
        throw refreshError;
      }
      this.showSessionEnded(refreshError);
      await this.endSession();
      throw new CanceledError('Session ended');
    }
  }

  /** Shown here, not by the pages: the requests that were waiting are all cancelled. */
  private showSessionEnded(refreshError: unknown): void {
    const code = isAxiosError(refreshError) ? refreshError.response?.data?.error?.code : undefined;
    const key = `errors.${code}`;
    NotificationService.error(i18n.global.t(i18n.global.te(key) ? key : `errors.${ErrorCodes.AUTH.UNAUTHORIZED.CODE}`));
  }

  /** Local logout + login page. No logout call - without a valid token it could only fail. */
  private async endSession(): Promise<void> {
    const { useAuthStore } = await import('../stores/auth');
    useAuthStore().clearSession();
    const { default: router } = await import('../router');
    if (router.currentRoute.value.name !== ROUTE_NAME.LOGIN) {
      router.push({ name: ROUTE_NAME.LOGIN });
    }
  }

  /** Waits for one shared refresh when one is running or the token is about to expire. */
  private async ensureFreshToken(): Promise<void> {
    if (this.refreshing || this.isExpiringSoon(Cookies.get(AUTH_COOKIE.TOKEN))) {
      await this.refreshAccessToken();
    }
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

export default new ApiService();
