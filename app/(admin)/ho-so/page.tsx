"use client";

import {
  Bell,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Edit3,
  KeyRound,
  Laptop,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { gatewayApi } from "@/lib/api/gateway";
import { getRoleLabel } from "@/lib/auth/session-user";
import styles from "./ho-so.module.css";

type Profile = {
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, refreshSession } = useAuthSession();
  const initialProfile: Profile = {
    name: user?.name ?? "Người dùng",
    email: user?.email ?? "",
    phone: "Backend chưa cung cấp",
    department: "NRApp",
    position: getRoleLabel(user?.role),
  };
  const [tab, setTab] = useState<"profile" | "security" | "notifications">("profile");
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState("");
  const editDialogRef = useRef<HTMLFormElement>(null);
  const deleteDialogRef = useRef<HTMLElement>(null);

  const initials = useMemo(
    () => profile.name.split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase(),
    [profile.name],
  );

  useEffect(() => {
    if (!editing && !deleteOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (deleteOpen) setDeleteOpen(false);
      else setEditing(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleteOpen, editing]);

  useEffect(() => {
    const dialog = deleteOpen ? deleteDialogRef.current : editing ? editDialogRef.current : null;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const getFocusable = () => Array.from(
      dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
      ),
    );
    getFocusable()[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", trapFocus);
    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      previousFocus?.focus();
    };
  }, [deleteOpen, editing]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  };

  const openEditor = () => {
    setDraft(profile);
    setEditing(true);
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.email.trim()) return;
    try {
      const name = draft.name.trim();
      const email = draft.email.trim().toLowerCase();
      if (name !== profile.name) await gatewayApi("user/update/user", { method: "POST", json: { username: name } });
      if (email !== profile.email) await gatewayApi("auth/me/email", { method: "PATCH", json: { email } });
      setProfile({ ...draft, name, email });
      setEditing(false);
      await refreshSession();
      notify("Thông tin tài khoản đã được cập nhật trên máy chủ");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/dang-nhap");
    router.refresh();
  };

  const deleteAccount = async () => {
    try {
      await gatewayApi("auth/me", { method: "DELETE" });
      await handleLogout();
    } catch (error) {
      setDeleteOpen(false);
      notify(error instanceof Error ? error.message : "Không thể xóa tài khoản.");
    }
  };

  const handleTabKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const order: (typeof tab)[] = ["profile", "security", "notifications"];
    const currentIndex = order.indexOf(tab);
    const nextTab = event.key === "Home"
      ? order[0]
      : event.key === "End"
        ? order.at(-1)!
        : order[(currentIndex + (event.key === "ArrowRight" ? 1 : -1) + order.length) % order.length];
    setTab(nextTab);
    window.requestAnimationFrame(() => document.getElementById(`${nextTab}-tab`)?.focus());
  };

  return (
    <div>
      <PageHeader
        eyebrow="Tài khoản quản trị"
        title="Hồ sơ cá nhân"
        description="Quản lý thông tin cá nhân và bảo mật đăng nhập."
        actions={
          <button className="button-primary" onClick={openEditor}>
            <Edit3 size={16} /> Chỉnh sửa hồ sơ
          </button>
        }
      />

      <section className={styles.profileHero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroIdentity}>
          <div className={styles.heroAvatar}>
            <Avatar initials={initials} size="xl" />
            <span className={styles.verified}><Check size={12} /></span>
          </div>
          <div className={styles.heroCopy}>
            <p>HDG WorkSpace</p>
            <h2>{profile.name}</h2>
            <div className={styles.heroMeta}>
              <span><BriefcaseBusiness size={13} /> {profile.position}</span>
              <span><ShieldCheck size={13} /> Mã {user?.id ?? "—"}</span>
            </div>
          </div>
        </div>
        <div className={styles.heroStatus}>
          <span><CheckCircle2 size={17} /> Tài khoản hoạt động</span>
          <small>Phiên trình duyệt hiện tại</small>
        </div>
      </section>

      <div className={styles.tabBar} role="tablist" aria-label="Cài đặt tài khoản" onKeyDown={handleTabKey}>
        <button id="profile-tab" className={tab === "profile" ? styles.tabActive : ""} onClick={() => setTab("profile")} role="tab" aria-selected={tab === "profile"} aria-controls="profile-panel" tabIndex={tab === "profile" ? 0 : -1}>
          <UserRound size={16} /> Thông tin
        </button>
        <button id="security-tab" className={tab === "security" ? styles.tabActive : ""} onClick={() => setTab("security")} role="tab" aria-selected={tab === "security"} aria-controls="security-panel" tabIndex={tab === "security" ? 0 : -1}>
          <ShieldCheck size={16} /> Bảo mật
        </button>
        <button id="notifications-tab" className={tab === "notifications" ? styles.tabActive : ""} onClick={() => setTab("notifications")} role="tab" aria-selected={tab === "notifications"} aria-controls="notifications-panel" tabIndex={tab === "notifications" ? 0 : -1}>
          <Bell size={16} /> Thông báo
        </button>
      </div>

      {tab === "profile" ? (
        <div className={styles.profileGrid} id="profile-panel" role="tabpanel" aria-labelledby="profile-tab">
          <section className={`${styles.card} ${styles.detailsCard}`}>
            <div className={styles.cardHeader}>
              <div>
                <p>Hồ sơ tài khoản</p>
                <h3>Thông tin cơ bản</h3>
              </div>
              <Badge tone="red">{getRoleLabel(user?.role)}</Badge>
            </div>
            <div className={styles.infoList}>
              <InfoRow icon={<UserRound size={17} />} label="Họ và tên" value={profile.name} />
              <InfoRow icon={<Mail size={17} />} label="Địa chỉ email" value={profile.email} verified />
              <InfoRow icon={<Phone size={17} />} label="Số điện thoại" value={profile.phone} />
              <InfoRow icon={<BriefcaseBusiness size={17} />} label="Vai trò hệ thống" value={profile.position} />
              <InfoRow icon={<ShieldCheck size={17} />} label="Nguồn dữ liệu" value="NRApp Gateway" />
            </div>
          </section>

          <aside className={styles.sideColumn}>
            <section className={`${styles.card} ${styles.summaryCard}`}>
              <div className={styles.cardHeader}>
                <div><p>Thông tin phiên</p><h3>Tài khoản hiện tại</h3></div>
              </div>
              <div className={styles.summaryStats}>
                <div><strong>OTP</strong><span>Xác thực đăng nhập</span></div>
                <div><strong>JWT</strong><span>Phiên API</span></div>
                <div><strong>{user?.role ?? "—"}</strong><span>Vai trò</span></div>
                <div><strong>HttpOnly</strong><span>Lưu cookie</span></div>
              </div>
            </section>

            <section className={`${styles.card} ${styles.quickCard}`}>
              <div className={styles.quickIcon}><ShieldCheck size={20} /></div>
              <div>
                <strong>Tài khoản được bảo vệ</strong>
                <p>Phiên web dùng cookie HttpOnly và mọi yêu cầu đi qua BFF cùng NRApp Gateway.</p>
              </div>
              <button onClick={() => setTab("security")}>Kiểm tra bảo mật</button>
            </section>
          </aside>
        </div>
      ) : null}

      {tab === "security" ? (
        <div className={styles.securityGrid} id="security-panel" role="tabpanel" aria-labelledby="security-tab">
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div><p>Cài đặt bảo vệ</p><h3>Bảo mật đăng nhập</h3></div>
              <span className={styles.secureLabel}><LockKeyhole size={14} /> An toàn</span>
            </div>
            <div className={styles.securityItem}>
              <span className={styles.securityIcon}><KeyRound size={18} /></span>
              <div><strong>Mật khẩu</strong><p>Backend hiện chưa công bố API đổi mật khẩu.</p></div>
              <button className="button-secondary" disabled title="Backend chưa hỗ trợ">Đổi mật khẩu</button>
            </div>
            <div className={styles.securityItem}>
              <span className={styles.securityIcon}><Mail size={18} /></span>
              <div><strong>Xác thực OTP</strong><p>Mã OTP được gửi qua email khi tạo phiên đăng nhập mới.</p></div>
              <Badge tone="emerald">Bắt buộc</Badge>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div><p>Thiết bị đăng nhập</p><h3>Phiên đang hoạt động</h3></div>
              <Badge tone="emerald" dot>Phiên hiện tại</Badge>
            </div>
            <div className={styles.sessionItem}>
              <span><Laptop size={20} /></span>
              <div><strong>Trình duyệt hiện tại</strong><p>Được bảo vệ bằng cookie HttpOnly</p></div>
              <Badge tone="emerald">Đang dùng</Badge>
            </div>
          </section>
        </div>
      ) : null}

      {tab === "notifications" ? (
        <section className={`${styles.card} ${styles.notificationsCard}`} id="notifications-panel" role="tabpanel" aria-labelledby="notifications-tab">
          <div className={styles.cardHeader}>
            <div><p>Tùy chọn cá nhân</p><h3>Kênh thông báo</h3></div>
            <Badge tone="slate">Chưa hỗ trợ</Badge>
          </div>
          <div className={styles.notificationUnavailable}>
            <span className={styles.notificationOptionIcon}><Bell size={17} /></span>
            <div><strong>Backend chưa có API cài đặt thông báo</strong><p>Các bộ đếm cần xử lý ở thanh điều hướng được lấy trực tiếp từ API. Hiện chưa thể cấu hình email hoặc bật/tắt từng loại thông báo.</p></div>
          </div>
        </section>
      ) : null}

      <section className={styles.dangerZone}>
        <div>
          <span className={styles.dangerIcon}><Trash2 size={18} /></span>
          <div><strong>Vùng nguy hiểm</strong><p>Xóa tài khoản sẽ thu hồi toàn bộ quyền truy cập và không thể hoàn tác.</p></div>
        </div>
        <div className={styles.dangerActions}>
          <button className="button-secondary" onClick={() => void handleLogout()}><LogOut size={15} /> Đăng xuất</button>
          <button className="button-danger" onClick={() => setDeleteOpen(true)}><Trash2 size={15} /> Xóa tài khoản</button>
        </div>
      </section>

      {editing ? (
        <div className="modal-backdrop" onMouseDown={() => setEditing(false)}>
          <form ref={editDialogRef} className={`${styles.editModal} modal-card`} onSubmit={saveProfile} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
            <div className={styles.modalHeader}>
              <div><p>Cập nhật tài khoản</p><h2 id="edit-profile-title">Chỉnh sửa hồ sơ</h2></div>
              <button type="button" onClick={() => setEditing(false)} aria-label="Đóng"><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.editIdentity}><Avatar initials={initials} size="lg" /><div><strong>Ảnh đại diện</strong><span>Backend hiện dùng tên viết tắt và chưa có API tải ảnh.</span></div><button type="button" className="button-secondary" disabled>Đổi ảnh</button></div>
              <label><span className="form-label">Họ và tên</span><input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required autoFocus /></label>
              <div className={styles.formGrid}>
                <label><span className="form-label">Email</span><input className="field" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required /></label>
                <label><span className="form-label">Số điện thoại</span><input className="field" value={draft.phone} disabled /></label>
              </div>
              <div className={styles.formGrid}>
                <label><span className="form-label">Hệ thống</span><input className="field" value={draft.department} disabled /></label>
                <label><span className="form-label">Vai trò</span><input className="field" value={draft.position} disabled /></label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="button-secondary" onClick={() => setEditing(false)}>Hủy</button>
              <button className="button-primary" type="submit"><Save size={15} /> Lưu thay đổi</button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteOpen ? (
        <div className="modal-backdrop" onMouseDown={() => setDeleteOpen(false)}>
          <section ref={deleteDialogRef} className={`${styles.deleteModal} modal-card`} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
            <span><Trash2 size={23} /></span>
            <h2 id="delete-account-title">Xóa tài khoản?</h2>
            <p>Tài khoản và quyền quản trị của bạn sẽ bị xóa vĩnh viễn trên NRApp. Thao tác này không thể hoàn tác.</p>
            <div>
              <button className="button-secondary" onClick={() => setDeleteOpen(false)} autoFocus>Giữ tài khoản</button>
              <button className="button-danger" onClick={() => void deleteAccount()}>Xóa vĩnh viễn</button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? <div className={styles.toast} role="status" aria-live="polite"><CheckCircle2 size={16} /> {toast}</div> : null}
    </div>
  );
}

function InfoRow({ icon, label, value, verified = false }: { icon: React.ReactNode; label: string; value: string; verified?: boolean }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoIcon}>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
      {verified ? <span className={styles.infoVerified}><CheckCircle2 size={13} /> Đã xác minh</span> : null}
    </div>
  );
}
