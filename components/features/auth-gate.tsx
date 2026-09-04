"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { useAuthSession } from "@/components/providers/auth-session-provider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const { status, error, refreshSession } = useAuthSession();
  useEffect(() => { if (status === "unauthenticated") router.replace(`/dang-nhap?redirect=${encodeURIComponent(pathname)}`); }, [pathname, router, status]);
  if (status === "error") return <main className="centered-page"><section className="surface-card empty-page-card" role="alert"><ShieldAlert size={27} /><h1>Tạm thời mất kết nối</h1><p>{error}</p><button className="button-primary" onClick={() => void refreshSession()}><RefreshCw size={16} /> Thử lại</button></section></main>;
  if (status !== "authenticated") return <div className="route-loading" role="status"><span /><p>Đang kiểm tra phiên quản trị...</p></div>;
  return children;
}
