import "server-only";
import { cookies } from "next/headers";

const names = { access: "nrapp.admin.access_token", refresh: "nrapp.admin.refresh_token", pendingEmail: "nrapp.admin.pending_email" } as const;
const secure = () => process.env.NRAPP_COOKIE_SECURE?.trim().toLowerCase() === "false" ? false : process.env.NRAPP_COOKIE_SECURE?.trim().toLowerCase() === "true" ? true : process.env.NODE_ENV === "production";
const options = (maxAge: number) => ({ httpOnly: true, secure: secure(), sameSite: "lax" as const, path: "/", maxAge });

export async function setPendingEmail(email: string) { (await cookies()).set(names.pendingEmail, email, options(300)); }
export async function getPendingEmail() { return (await cookies()).get(names.pendingEmail)?.value ?? null; }
export async function clearPendingEmail() { (await cookies()).set(names.pendingEmail, "", options(0)); }
export async function setSessionCookies(access: string, refresh: string) { const store = await cookies(); store.set(names.access, access, options(604_800)); store.set(names.refresh, refresh, options(2_592_000)); }
export async function getSessionTokens() { const store = await cookies(); return { accessToken: store.get(names.access)?.value ?? null, refreshToken: store.get(names.refresh)?.value ?? null }; }
export async function clearSessionCookies() { const store = await cookies(); store.set(names.access, "", options(0)); store.set(names.refresh, "", options(0)); store.set(names.pendingEmail, "", options(0)); }
