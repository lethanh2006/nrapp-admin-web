import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/features/auth-gate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate><AppShell>{children}</AppShell></AuthGate>;
}
