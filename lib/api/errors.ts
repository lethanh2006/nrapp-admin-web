function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class GatewayApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(status: number, payload: unknown) {
    const rawMessage = isRecord(payload) ? payload.message : undefined;
    const message = Array.isArray(rawMessage) ? rawMessage.filter((item): item is string => typeof item === "string").join("\n") : rawMessage;
    super(status >= 500 ? "Gateway hiện không khả dụng. Vui lòng thử lại sau." : typeof message === "string" && message.trim() ? message.trim() : `Gateway trả về lỗi ${status}.`);
    this.name = "GatewayApiError";
    this.status = status;
    this.code = isRecord(payload) && typeof payload.code === "string" ? payload.code : undefined;
  }
}

export class GatewayUnavailableError extends Error {
  readonly status = 502;
  readonly code = "GATEWAY_UNAVAILABLE";
  constructor(message = "Không thể kết nối đến Gateway. Vui lòng thử lại sau.") { super(message); this.name = "GatewayUnavailableError"; }
}
