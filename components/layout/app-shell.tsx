"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Grid2X2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Search,
  Settings,
  Sparkles,
  UserCircle,
  Users,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { getRoleLabel, getUserInitials, type SessionUser } from "@/lib/auth/session-user";
import styles from "./app-shell.module.css";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string };

const navigation: { label: string; items: NavItem[] }[] = [
  {
    label: "Tổng quan",
    items: [{ href: "/dashboard", label: "Bảng điều hành", icon: LayoutDashboard }],
  },
  {
    label: "Vận hành",
    items: [
      { href: "/lich-lam", label: "Lịch & chấm công", icon: CalendarDays },
      { href: "/cong-viec", label: "Công việc", icon: ClipboardCheck },
      { href: "/can-tin", label: "Vận hành căn tin", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Tổ chức",
    items: [
      { href: "/nhan-su", label: "Danh bạ nhân sự", icon: Users },
      { href: "/tro-chuyen", label: "Trò chuyện", icon: MessageCircle },
      { href: "/tien-ich", label: "Trung tâm tiện ích", icon: Grid2X2 },
    ],
  },
];

const titles: Record<string, string> = {
  "/dashboard": "Bảng điều hành",
  "/lich-lam": "Lịch & chấm công",
  "/cong-viec": "Điều phối công việc",
  "/can-tin": "Vận hành căn tin",
  "/nhan-su": "Danh bạ nhân sự",
  "/tro-chuyen": "Trò chuyện nội bộ",
  "/tien-ich": "Trung tâm tiện ích",
  "/ho-so": "Hồ sơ cá nhân",
};

function SidebarContent({
  pathname,
  collapsed,
  onCollapse,
  onNavigate,
  user,
  onLogout,
  logoutPending,
}: {
  pathname: string;
  collapsed: boolean;
  onCollapse: () => void;
  onNavigate?: () => void;
  user: SessionUser;
  onLogout: () => void;
  logoutPending: boolean;
}) {
  return (
    <>
      <div className={styles.brandRow}>
        <Link href="/dashboard" className={styles.brand} onClick={onNavigate}>
          <span className={styles.brandMark}>HD</span>
          <span className={styles.brandCopy}>
            <strong>WorkSpace</strong>
            <small>Admin Center</small>
          </span>
        </Link>
        <button className={styles.collapseButton} onClick={onCollapse} aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className={styles.workspaceCard}>
        <span className={styles.workspaceIcon}><Sparkles size={15} /></span>
        <span className={styles.workspaceCopy}>
          <small>Không gian làm việc</small>
          <strong>HDG Group</strong>
        </span>
        <ChevronLeft className={styles.workspaceChevron} size={15} />
      </div>

      <nav className={styles.nav} aria-label="Điều hướng quản trị">
        {navigation.map((group) => (
          <div className={styles.navGroup} key={group.label}>
            <p className={styles.navLabel}>{group.label}</p>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                  key={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                  <span className={styles.navText}>{item.label}</span>
                  {item.badge ? <span className={styles.navBadge}>{item.badge}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/ho-so" className={`${styles.userCard} ${pathname === "/ho-so" ? styles.userCardActive : ""}`} onClick={onNavigate}>
          <Avatar initials={getUserInitials(user.name)} size="sm" />
          <span className={styles.userCopy}>
            <strong>{user.name}</strong>
            <small>{getRoleLabel(user.role)}</small>
          </span>
          <Settings className={styles.userSettings} size={16} />
        </Link>
        <button type="button" className={styles.logoutButton} title="Đăng xuất" aria-label="Đăng xuất" onClick={onLogout} disabled={logoutPending}>
          <LogOut size={18} />
          <span>{logoutPending ? "Đang đăng xuất..." : "Đăng xuất"}</span>
        </button>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthSession();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileDialogRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  async function handleLogout() {
    if (logoutPending) return;
    setLogoutPending(true);
    try { await logout(); router.replace("/dang-nhap"); router.refresh(); } finally { setLogoutPending(false); }
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const focusGlobalSearch = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (mobileOpen) setMobileOpen(false);
        else if (notificationsOpen) setNotificationsOpen(false);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusGlobalSearch);
    return () => window.removeEventListener("keydown", focusGlobalSearch);
  }, [mobileOpen, notificationsOpen]);

  useEffect(() => {
    const dialog = mobileOpen ? mobileDialogRef.current : null;
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
  }, [mobileOpen]);

  const pageTitle = titles[pathname] ?? "Quản trị WorkSpace";
  const searchResults = useMemo(() => {
    const query = globalQuery.trim().toLocaleLowerCase("vi");
    const allItems = navigation.flatMap((group) => group.items);
    return (query
      ? allItems.filter((item) => item.label.toLocaleLowerCase("vi").includes(query))
      : allItems
    ).slice(0, 5);
  }, [globalQuery]);

  if (!user) return null;

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}>
      <aside className={styles.sidebar}>
        <SidebarContent
          pathname={pathname}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((value) => !value)}
          user={user}
          onLogout={() => void handleLogout()}
          logoutPending={logoutPending}
        />
      </aside>

      {mobileOpen ? (
        <div className={styles.mobileOverlay} onMouseDown={() => setMobileOpen(false)}>
          <aside ref={mobileDialogRef} className={styles.mobileSidebar} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Điều hướng quản trị">
            <button className={styles.mobileClose} onClick={() => setMobileOpen(false)} aria-label="Đóng điều hướng" autoFocus>
              <X size={19} />
            </button>
            <SidebarContent
              pathname={pathname}
              collapsed={false}
              onCollapse={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              user={user}
              onLogout={() => void handleLogout()}
              logoutPending={logoutPending}
            />
          </aside>
        </div>
      ) : null}

      <div className={styles.contentColumn}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Mở điều hướng">
              <Menu size={20} />
            </button>
            <div>
              <p className={styles.topbarEyebrow}>Khu vực quản lý</p>
              <strong className={styles.topbarTitle}>{pageTitle}</strong>
            </div>
          </div>

          <div className={styles.topbarActions}>
            <div
              className={styles.globalSearchWrap}
              onFocus={() => setSearchFocused(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setSearchFocused(false);
                }
              }}
            >
              <label className={styles.globalSearch}>
                <Search size={17} />
                <span className="sr-only">Tìm kiếm toàn hệ thống</span>
                <input
                  ref={searchInputRef}
                  value={globalQuery}
                  onChange={(event) => setGlobalQuery(event.target.value)}
                  placeholder="Tìm kiếm nhanh..."
                />
                <kbd>⌘ K</kbd>
              </label>
              {searchFocused ? (
                <div className={styles.searchResults}>
                  <p>{globalQuery.trim() ? "Kết quả phù hợp" : "Đi đến nhanh"}</p>
                  {searchResults.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        href={item.href}
                        key={item.href}
                        onClick={() => {
                          setGlobalQuery("");
                          setSearchFocused(false);
                        }}
                      >
                        <span><Icon size={16} /></span>
                        {item.label}
                        <ChevronLeft size={14} />
                      </Link>
                    );
                  })}
                  {searchResults.length === 0 ? <div className={styles.noSearchResult}>Không tìm thấy khu vực phù hợp.</div> : null}
                </div>
              ) : null}
            </div>
            <span className={styles.today}>Hôm nay</span>
            <div className={styles.notificationWrap}>
              <button
                className={styles.iconButton}
                onClick={() => setNotificationsOpen((value) => !value)}
                aria-label="Thông báo"
                aria-expanded={notificationsOpen}
              >
                <Bell size={19} />
                {hasUnreadNotifications ? <span className={styles.notificationDot} /> : null}
              </button>
              {notificationsOpen ? (
                <div className={styles.notifications}>
                  <div className={styles.notificationHeader}>
                    <strong>Thông báo</strong>
                    <button onClick={() => setHasUnreadNotifications(false)}>
                      {hasUnreadNotifications ? "Đánh dấu đã đọc" : "Đã đọc tất cả"}
                    </button>
                  </div>
                  <div className={styles.notificationItem}>
                    <span className={`${styles.notificationIcon} ${styles.notificationIconGreen}`}><CheckCircle2 size={16} /></span>
                    <div><strong>Đã kết nối NRApp Gateway</strong><p>Dữ liệu trực tiếp được tải tại từng phân hệ.</p><small>Phiên hiện tại</small></div>
                  </div>
                </div>
              ) : null}
            </div>
            <Link href="/ho-so" className={styles.topbarAvatar} aria-label="Mở hồ sơ cá nhân">
              <Avatar initials={getUserInitials(user.name)} size="sm" />
            </Link>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>

      <nav className={styles.mobileBottomNav} aria-label="Điều hướng nhanh">
        <Link href="/dashboard" className={pathname === "/dashboard" ? styles.mobileNavActive : ""}>
          <LayoutDashboard size={21} />
          <span>Tổng quan</span>
        </Link>
        <Link href="/lich-lam" className={styles.scanButton} aria-label="Mở quản lý chấm công">
          <ScanLine size={25} />
        </Link>
        <Link href="/ho-so" className={pathname === "/ho-so" ? styles.mobileNavActive : ""}>
          <UserCircle size={22} />
          <span>Hồ sơ</span>
        </Link>
      </nav>

    </div>
  );
}
