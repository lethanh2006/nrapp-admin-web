import "server-only";

import { randomUUID } from "node:crypto";
import { GatewayApiError, GatewayUnavailableError } from "@/lib/api/errors";

export type GatewayRequestOptions = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; accessToken?: string };

function getGatewayConfig() {
  const baseUrl = (process.env.NRAPP_API_URL?.trim() || "https://api.thanhlelmtp2006.id.vn/api").replace(/\/+$/, "");
  let parsed: URL;
  try { parsed = new URL(baseUrl); } catch { throw new GatewayUnavailableError("NRAPP_API_URL không phải URL hợp lệ."); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new GatewayUnavailableError("NRAPP_API_URL chỉ hỗ trợ HTTP hoặc HTTPS.");
  const value = Number(process.env.NRAPP_API_TIMEOUT_MS ?? 10_000);
  return { baseUrl, timeoutMs: Number.isFinite(value) ? Math.min(Math.max(value, 1_000), 60_000) : 10_000 };
}

export async function gatewayRequest<T>(path: string, { method = "GET", body, accessToken }: GatewayRequestOptions = {}): Promise<T> {
  const { baseUrl, timeoutMs } = getGatewayConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers({ Accept: "application/json", "x-request-id": randomUUID() });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const response = await fetch(`${baseUrl}/${path.replace(/^\/+/, "")}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", redirect: "manual", signal: controller.signal });
    const text = await response.text();
    let payload: unknown;
    try { payload = text ? JSON.parse(text) as unknown : undefined; } catch { payload = text ? { message: text } : undefined; }
    if (!response.ok) throw new GatewayApiError(response.status, payload);
    return payload as T;
  } catch (error) {
    if (error instanceof GatewayApiError || error instanceof GatewayUnavailableError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new GatewayUnavailableError("Kết nối đến Gateway đã quá thời gian.");
    throw new GatewayUnavailableError();
  } finally { clearTimeout(timeout); }
}
