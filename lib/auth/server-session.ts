import "server-only";
import { createHash } from "node:crypto";
import { GatewayApiError } from "@/lib/api/errors";
import { gatewayRequest, type GatewayRequestOptions } from "@/lib/api/server";
import { clearSessionCookies, getSessionTokens, setSessionCookies } from "@/lib/auth/cookies";
import { normalizeSessionUser, type SessionUser } from "@/lib/auth/session-user";

type GatewaySession = { token: string; refreshToken: string; user: unknown };
export class SessionError extends Error { constructor(readonly status: 401 | 403, readonly code: "SESSION_REQUIRED" | "FORBIDDEN_ROLE", message: string) { super(message); this.name = "SessionError"; } }
const unauthorized = () => new SessionError(401, "SESSION_REQUIRED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
const forbidden = () => new SessionError(403, "FORBIDDEN_ROLE", "Tài khoản không có quyền truy cập cổng quản trị.");
const refreshFlights = new Map<string, Promise<GatewaySession>>();

function requestRefresh(refreshToken: string) {
  const key = createHash("sha256").update(refreshToken).digest("hex");
  const active = refreshFlights.get(key);
  if (active) return active;
  const request = gatewayRequest<GatewaySession>("/auth/refresh", { method: "POST", body: { refreshToken } });
  refreshFlights.set(key, request);
  void request.finally(() => { setTimeout(() => { if (refreshFlights.get(key) === request) refreshFlights.delete(key); }, 5_000); }).catch(() => undefined);
  return request;
}

async function refreshSession(refreshToken: string) {
  try {
    const session = await requestRefresh(refreshToken);
    const user = normalizeSessionUser(session.user);
    if (!user || !session.token || !session.refreshToken) { await clearSessionCookies(); throw forbidden(); }
    await setSessionCookies(session.token, session.refreshToken);
    return session.token;
  } catch (error) {
    if (error instanceof SessionError) throw error;
    if (error instanceof GatewayApiError && [400, 401, 403, 404].includes(error.status)) { await clearSessionCookies(); throw unauthorized(); }
    throw error;
  }
}

async function profile(accessToken: string) {
  const result = await gatewayRequest<{ user: unknown }>("/user/me", { accessToken });
  const user = normalizeSessionUser(result.user);
  if (!user) { await clearSessionCookies(); throw forbidden(); }
  return user;
}

export async function getCurrentSessionUser(): Promise<SessionUser> {
  const { accessToken, refreshToken } = await getSessionTokens();
  if (!accessToken && !refreshToken) throw unauthorized();
  let token = accessToken;
  if (!token && refreshToken) token = await refreshSession(refreshToken);
  if (!token) throw unauthorized();
  try { return await profile(token); } catch (error) {
    if (!(error instanceof GatewayApiError) || error.status !== 401 || !refreshToken) {
      if (error instanceof GatewayApiError && [401, 403, 404].includes(error.status)) { await clearSessionCookies(); throw unauthorized(); }
      throw error;
    }
  }
  return profile(await refreshSession(refreshToken));
}

export async function sessionGatewayRequest<T>(path: string, options: Omit<GatewayRequestOptions, "accessToken"> = {}) {
  const { accessToken, refreshToken } = await getSessionTokens();
  if (!accessToken && !refreshToken) throw unauthorized();
  let token = accessToken;
  if (!token && refreshToken) token = await refreshSession(refreshToken);
  if (!token) throw unauthorized();
  try { return await gatewayRequest<T>(path, { ...options, accessToken: token }); } catch (error) {
    if (!(error instanceof GatewayApiError) || error.status !== 401 || !refreshToken) throw error;
  }
  return gatewayRequest<T>(path, { ...options, accessToken: await refreshSession(refreshToken) });
}
