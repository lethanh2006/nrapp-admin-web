"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  QrCode,
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
      { href: "/lich-lam", label: "Lịch & chấm công", icon: CalendarDays, badge: "3" },
      { href: "/cong-viec", label: "Công việc", icon: ClipboardCheck, badge: "5" },
      { href: "/can-tin", label: "Vận hành căn tin", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Tổ chức",
    items: [
      { href: "/nhan-su", label: "Danh bạ nhân sự", icon: Users },
      { href: "/tro-chuyen", label: "Trò chuyện", icon: MessageCircle, badge: "2" },
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
}: {
  pathname: string;
  collapsed: boolean;
  onCollapse: () => void;
  onNavigate?: () => void;
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
          <Avatar initials="MA" size="sm" />
          <span className={styles.userCopy}>
            <strong>Minh Anh</strong>
            <small>Quản trị viên</small>
          </span>
          <Settings className={styles.userSettings} size={16} />
        </Link>
        <Link href="/dang-nhap" className={styles.logoutButton} title="Đăng xuất" aria-label="Đăng xuất">
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </Link>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileDialogRef = useRef<HTMLElement>(null);
  const qrDialogRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen || qrOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, qrOpen]);

  useEffect(() => {
    const focusGlobalSearch = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (qrOpen) setQrOpen(false);
        else if (mobileOpen) setMobileOpen(false);
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
  }, [mobileOpen, notificationsOpen, qrOpen]);

  useEffect(() => {
    const dialog = qrOpen ? qrDialogRef.current : mobileOpen ? mobileDialogRef.current : null;
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
  }, [mobileOpen, qrOpen]);

  const pageTitle = titles[pathname] ?? "Quản trị WorkSpace";
  const searchResults = useMemo(() => {
    const query = globalQuery.trim().toLocaleLowerCase("vi");
    const allItems = navigation.flatMap((group) => group.items);
    return (query
      ? allItems.filter((item) => item.label.toLocaleLowerCase("vi").includes(query))
      : allItems
    ).slice(0, 5);
  }, [globalQuery]);

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}>
      <aside className={styles.sidebar}>
        <SidebarContent
          pathname={pathname}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((value) => !value)}
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
                    <span className={`${styles.notificationIcon} ${styles.notificationIconRed}`}><CalendarDays size={16} /></span>
                    <div><strong>3 lịch làm chờ duyệt</strong><p>Các yêu cầu mới vừa được gửi lên.</p><small>12 phút trước</small></div>
                  </div>
                  <div className={styles.notificationItem}>
                    <span className={`${styles.notificationIcon} ${styles.notificationIconGreen}`}><CheckCircle2 size={16} /></span>
                    <div><strong>Đã hoàn tất kiểm kê</strong><p>Báo cáo kho căn tin đã sẵn sàng.</p><small>45 phút trước</small></div>
                  </div>
                </div>
              ) : null}
            </div>
            <Link href="/ho-so" className={styles.topbarAvatar} aria-label="Mở hồ sơ cá nhân">
              <Avatar initials="MA" size="sm" />
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
        <button className={styles.scanButton} onClick={() => setQrOpen(true)} aria-label="Quét mã chấm công">
          <ScanLine size={25} />
        </button>
        <Link href="/ho-so" className={pathname === "/ho-so" ? styles.mobileNavActive : ""}>
          <UserCircle size={22} />
          <span>Hồ sơ</span>
        </Link>
      </nav>

      {qrOpen ? (
        <div className="modal-backdrop" onMouseDown={() => setQrOpen(false)}>
          <section ref={qrDialogRef} className={`${styles.qrModal} modal-card`} onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="Quét mã chấm công">
            <button className={styles.qrClose} onClick={() => setQrOpen(false)} aria-label="Đóng" autoFocus><X size={19} /></button>
            <span className={styles.qrModalIcon}><QrCode size={24} /></span>
            <p className={styles.qrEyebrow}>Chấm công nhanh</p>
            <h2>Đưa mã QR vào khung quét</h2>
            <p>Trình diễn giao diện máy quét trên web. Khi kết nối backend, khu vực này có thể sử dụng camera của thiết bị.</p>
            <div className={styles.qrFrame}>
              <QrCode size={146} strokeWidth={1.35} />
              <span className={styles.scanLine} />
            </div>
            <button className="button-secondary" onClick={() => setQrOpen(false)}>Đóng máy quét</button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
