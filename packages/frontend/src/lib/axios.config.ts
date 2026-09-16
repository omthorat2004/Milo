import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

type RetryConfig = InternalAxiosRequestConfig & { retried?: boolean };

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS) || 15_000,
  withCredentials: true,
});

let refreshing: Promise<unknown> | null = null;

function refreshSession(): Promise<unknown> {
  refreshing ??= api.post("/auth/refresh").finally(() => {
    refreshing = null;
  });

  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const canRetry =
      error.response?.status === 401 &&
      config !== undefined &&
      !config.retried &&
      config.url !== "/auth/refresh";

    if (!canRetry) return Promise.reject(error);

    config.retried = true;
    await refreshSession();

    return api.request(config);
  },
);
