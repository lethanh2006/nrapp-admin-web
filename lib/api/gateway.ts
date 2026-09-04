import { apiRequest, type ApiRequestOptions } from "@/lib/api/client";

export function gatewayApi<T>(path: string, options: ApiRequestOptions = {}) {
  return apiRequest<T>(`/api/gateway/${path.replace(/^\/+/, "")}`, options);
}
