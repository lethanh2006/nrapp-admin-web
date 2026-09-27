import "server-only";

import { randomUUID } from "node:crypto";
import { GatewayApiError, GatewayUnavailableError } from "@/lib/api/errors";

export type GatewayRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
  timeoutMs?: number;
};

const RETRYABLE_GATEWAY_STATUSES = new Set([502, 503, 504]);
const GET_MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 150;

function getGatewayConfig() {
  const baseUrl = (process.env.NRAPP_API_URL?.trim() || "https://api-vps.thanhlelmtp2006.id.vn/api").replace(/\/+$/, "");
  let parsed: URL;
  try { parsed = new URL(baseUrl); } catch { throw new GatewayUnavailableError("NRAPP_API_URL không phải URL hợp lệ."); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new GatewayUnavailableError("NRAPP_API_URL chỉ hỗ trợ HTTP hoặc HTTPS.");
  const value = Number(process.env.NRAPP_API_TIMEOUT_MS ?? 10_000);
  return { baseUrl, timeoutMs: Number.isFinite(value) ? Math.min(Math.max(value, 1_000), 60_000) : 10_000 };
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try { return JSON.parse(text) as unknown; }
  catch { return { message: text }; }
}

export async function gatewayRequest<T>(
  path: string,
  { method = "GET", body, accessToken, timeoutMs: requestTimeoutMs }: GatewayRequestOptions = {},
): Promise<T> {
  const { baseUrl, timeoutMs: defaultTimeoutMs } = getGatewayConfig();
  const timeoutMs = Number.isFinite(requestTimeoutMs)
    ? Math.min(Math.max(Number(requestTimeoutMs), 1_000), 60_000)
    : defaultTimeoutMs;
  const deadline = Date.now() + timeoutMs;
  const maxAttempts = method === "GET" ? GET_MAX_ATTEMPTS : 1;
  const requestId = randomUUID();
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    const attemptTimeoutMs = attempt < maxAttempts
      ? Math.max(1_000, Math.min(6_000, Math.floor(remainingMs * 0.65)))
      : remainingMs;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);
    const headers = new Headers({ Accept: "application/json", "x-request-id": requestId });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    try {
      const response = await fetch(`${baseUrl}/${path.replace(/^\/+/, "")}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      });
      const payload = await readPayload(response);
      if (response.ok) return payload as T;

      const apiError = new GatewayApiError(response.status, payload);
      if (attempt === maxAttempts || !RETRYABLE_GATEWAY_STATUSES.has(response.status)) throw apiError;
      lastError = apiError;
    } catch (error) {
      if (error instanceof GatewayApiError || error instanceof GatewayUnavailableError) throw error;
      lastError = error;
      if (attempt === maxAttempts) break;
    } finally {
      clearTimeout(timeout);
    }

    if (deadline - Date.now() <= RETRY_DELAY_MS) break;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  if (lastError instanceof GatewayApiError || lastError instanceof GatewayUnavailableError) throw lastError;
  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new GatewayUnavailableError("Kết nối đến Gateway đã quá thời gian.");
  }
  throw new GatewayUnavailableError(
    Date.now() >= deadline ? "Kết nối đến Gateway đã quá thời gian." : undefined,
  );
}
