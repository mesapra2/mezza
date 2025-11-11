// src/services/authService.ts
import axios, { AxiosError } from 'axios';

/* -------------------------------------------------------------------------- */
/*                            CONFIGURAÇÃO DE URL                             */
/* -------------------------------------------------------------------------- */

function getApiUrl(): string {
  // Tenta pegar do process.env (funciona em Vite, Next, Node e Jest)
  const hasProcess =
    typeof process !== 'undefined' && typeof process.env !== 'undefined';

  const fromViteEnv =
    hasProcess && typeof process.env.VITE_API_URL === 'string'
      ? process.env.VITE_API_URL
      : undefined;

  const fromNextPublic =
    hasProcess && typeof process.env.NEXT_PUBLIC_API_URL === 'string'
      ? process.env.NEXT_PUBLIC_API_URL
      : undefined;

  // Fallback
  const finalUrl = fromViteEnv || fromNextPublic || 'http://localhost:4000';

  // Tira barras sobrando no final
  return finalUrl.replace(/\/+$/, '');
}

function extractAxiosMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<{ message?: string }>;
  const specific = axiosErr?.response?.data?.message;
  return typeof specific === 'string' ? specific : fallback;
}

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SendVerificationPayload = {
  userId: string;
  phone: string;
};

export type VerifyPhonePayload = {
  userId: string;
  code: string;
};

export type ResendVerificationPayload = {
  userId: string;
  phone: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export type AuthResponse = {
  user: AuthUser;
  tokens?: AuthTokens;
};

/* -------------------------------------------------------------------------- */
/*                             FUNÇÕES DE AUTH BASE                           */
/* -------------------------------------------------------------------------- */

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const API_URL = getApiUrl();
  const { data } = await axios.post<AuthResponse>(`${API_URL}/auth/register`, payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const API_URL = getApiUrl();
  const { data } = await axios.post<AuthResponse>(`${API_URL}/auth/login`, payload);
  return data;
}

export async function getCurrentUser(token?: string): Promise<AuthUser> {
  const API_URL = getApiUrl();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const { data } = await axios.get<AuthUser>(`${API_URL}/auth/me`, { headers });
  return data;
}

export async function updateProfile(
  updates: Partial<AuthUser>,
  token?: string
): Promise<AuthUser> {
  const API_URL = getApiUrl();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const { data } = await axios.put<AuthUser>(`${API_URL}/auth/me`, updates, { headers });
  return data;
}

export async function logout(token?: string): Promise<void> {
  const API_URL = getApiUrl();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  await axios.post(`${API_URL}/auth/logout`, {}, { headers });
}

/* -------------------------------------------------------------------------- */
/*                           FUNÇÕES DE VERIFICAÇÃO SMS                       */
/* -------------------------------------------------------------------------- */

export async function sendVerificationCode({
  userId,
  phone
}: SendVerificationPayload): Promise<{ success: boolean; message?: string }> {
  const API_URL = getApiUrl();
  try {
    const { data } = await axios.post<{ success: boolean; message?: string }>(
      `${API_URL}/sms/send-code`,
      { userId, phone }
    );
    return data;
  } catch (err) {
    throw new Error(extractAxiosMessage(err, 'Erro ao enviar código'));
  }
}

export async function verifyPhone({
  userId,
  code
}: VerifyPhonePayload): Promise<{ success: boolean; message?: string }> {
  const API_URL = getApiUrl();
  try {
    const { data } = await axios.post<{ success: boolean; message?: string }>(
      `${API_URL}/sms/verify-code`,
      { userId, code }
    );
    return data;
  } catch (err) {
    throw new Error(extractAxiosMessage(err, 'Código inválido'));
  }
}

export async function resendVerificationCode({
  userId,
  phone
}: ResendVerificationPayload): Promise<{ success: boolean; message?: string }> {
  const API_URL = getApiUrl();
  try {
    const { data } = await axios.post<{ success: boolean; message?: string }>(
      `${API_URL}/sms/resend-code`,
      { userId, phone }
    );
    return data;
  } catch (err) {
    throw new Error(extractAxiosMessage(err, 'Erro ao reenviar código'));
  }
}

/* -------------------------------------------------------------------------- */
/*                          ALIAS DE COMPATIBILIDADE TESTE                    */
/* -------------------------------------------------------------------------- */

export async function verifyCode(payload: VerifyPhonePayload) {
  return verifyPhone(payload);
}

export async function resendCode(payload: ResendVerificationPayload) {
  return resendVerificationCode(payload);
}

/* -------------------------------------------------------------------------- */
/*                             EXPORTAÇÃO DEFAULT                             */
/* -------------------------------------------------------------------------- */

const authService = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  logout,
  sendVerificationCode,
  verifyPhone,
  resendVerificationCode,
  verifyCode,
  resendCode
};

export default authService;