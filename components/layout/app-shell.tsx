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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { gatewayApi } from "@/lib/api/gateway";
import { unwrapData, type ApiChatListItem, type ApiOrderPage, type ApiScheduleRequest, type ApiTaskPage, type ApiWorkRequest } from "@/lib/api/domain";
import { getRoleLabel, getUserInitials, type SessionUser } from "@/lib/auth/session-user";
import { NAVIGATION_METRICS_EVENT } from "@/lib/navigation-metrics";
import styles from "./app-shell.module.css";

type NavItem = { href: string; label: string; icon: LucideIcon };

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
  navigationCounts,
}: {
  pathname: string;
  collapsed: boolean;
  onCollapse: () => void;
  onNavigate?: () => void;
  user: SessionUser;
  onLogout: () => void;
  logoutPending: boolean;
  navigationCounts: Partial<Record<string, number>>;
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
              const count = navigationCounts[item.href];
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
                  {count ? <span className={styles.navBadge}>{count > 99 ? "99+" : count}</span> : null}
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
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [navigationMetrics, setNavigationMetrics] = useState<{
    openTasks: number | null;
    pendingSchedules: number | null;
    pendingWorkRequests: number | null;
    activeOrders: number | null;
    unreadMessages: number | null;
  }>({ openTasks: null, pendingSchedules: null, pendingWorkRequests: null, activeOrders: null, unreadMessages: null });
  const [navigationMetricsError, setNavigationMetricsError] = useState(false);
  const [navigationMetricsLoading, setNavigationMetricsLoading] = useState(true);
  const navigationMetricsRequestRef = useRef(0);

  const loadNavigationMetrics = useCallback(async () => {
    const requestId = ++navigationMetricsRequestRef.current;
    const openTasksRequest = Promise.all([
      gatewayApi<ApiTaskPage>("todo?status=todo&limit=1"),
      gatewayApi<ApiTaskPage>("todo?status=in_progress&limit=1"),
    ]).then((pages) => pages.reduce((total, page) => total + (page.pagination?.total ?? page.tasks?.length ?? 0), 0));
    const activeOrdersRequest = Promise.all(
      (["CREATED", "CONFIRMED", "COOKING", "READY"] as const).map((status) =>
        gatewayApi<ApiOrderPage>(`canteen/orders?status=${status}&limit=1`),
      ),
    ).then((pages) => pages.reduce((total, page) => total + (page.pagination?.total ?? page.orders?.length ?? 0), 0));
    const [tasksResult, schedulesResult, workRequestsResult, ordersResult, chatsResult] = await Promise.allSettled([
      openTasksRequest,
      gatewayApi<ApiScheduleRequest[] | { data: ApiScheduleRequest[] }>("workschedule/schedule/pending"),
      gatewayApi<ApiWorkRequest[] | { data: ApiWorkRequest[] }>("workschedule/requests/admin"),
      activeOrdersRequest,
      gatewayApi<{ chats: ApiChatListItem[] }>("chat/chat/all"),
    ]);
    if (requestId !== navigationMetricsRequestRef.current) return;

    setNavigationMetrics({
      openTasks: tasksResult.status === "fulfilled"
        ? tasksResult.value
        : null,
      pendingSchedules: schedulesResult.status === "fulfilled"
        ? unwrapData(schedulesResult.value).filter((request) => request.status === "pending").length
        : null,
      pendingWorkRequests: workRequestsResult.status === "fulfilled"
        ? unwrapData(workRequestsResult.value).filter((request) => request.status === "pending").length
        : null,
      activeOrders: ordersResult.status === "fulfilled"
        ? ordersResult.value
        : null,
      unreadMessages: chatsResult.status === "fulfilled"
        ? (chatsResult.value.chats ?? []).reduce((total, item) => total + Math.max(item.chat.unseenCount ?? 0, 0), 0)
        : null,
    });
    setNavigationMetricsError([tasksResult, schedulesResult, workRequestsResult, ordersResult, chatsResult].some((result) => result.status === "rejected"));
    setNavigationMetricsLoading(false);
  }, []);

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
    if (!user?.id) return;
    const refresh = () => void loadNavigationMetrics();
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(NAVIGATION_METRICS_EVENT, refresh);
    return () => {
      navigationMetricsRequestRef.current += 1;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(NAVIGATION_METRICS_EVENT, refresh);
    };
  }, [loadNavigationMetrics, pathname, user?.id]);

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
  const pendingApprovals = navigationMetrics.pendingSchedules === null || navigationMetrics.pendingWorkRequests === null
    ? null
    : navigationMetrics.pendingSchedules + navigationMetrics.pendingWorkRequests;
  const navigationCounts = {
    "/lich-lam": pendingApprovals ?? 0,
    "/cong-viec": navigationMetrics.openTasks ?? 0,
    "/can-tin": navigationMetrics.activeOrders ?? 0,
    "/tro-chuyen": navigationMetrics.unreadMessages ?? 0,
  };
  const notificationCount = Object.values(navigationCounts).reduce((total, count) => total + count, 0);
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
          navigationCounts={navigationCounts}
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
              navigationCounts={navigationCounts}
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
                {notificationCount > 0 ? <span className={styles.notificationDot} /> : null}
              </button>
              {notificationsOpen ? (
                <div className={styles.notifications}>
                  <div className={styles.notificationHeader}>
                    <strong>Nội dung cần xử lý</strong>
                    <span>Dữ liệu trực tiếp</span>
                  </div>
                  {(pendingApprovals ?? 0) > 0 ? <Link className={styles.notificationItem} href="/lich-lam" onClick={() => setNotificationsOpen(false)}><span className={`${styles.notificationIcon} ${styles.notificationIconRed}`}><CalendarDays size={16} /></span><div><strong>{pendingApprovals} yêu cầu lịch/đơn từ chờ duyệt</strong><p>{navigationMetrics.pendingSchedules} lịch làm và {navigationMetrics.pendingWorkRequests} đơn từ đang chờ xử lý.</p><small>Mở Lịch &amp; chấm công</small></div></Link> : null}
                  {(navigationMetrics.openTasks ?? 0) > 0 ? <Link className={styles.notificationItem} href="/cong-viec" onClick={() => setNotificationsOpen(false)}><span className={`${styles.notificationIcon} ${styles.notificationIconGreen}`}><ClipboardCheck size={16} /></span><div><strong>{navigationMetrics.openTasks} công việc đang mở</strong><p>Gồm công việc cần làm và đang thực hiện.</p><small>Mở Điều phối công việc</small></div></Link> : null}
                  {(navigationMetrics.activeOrders ?? 0) > 0 ? <Link className={styles.notificationItem} href="/can-tin" onClick={() => setNotificationsOpen(false)}><span className={`${styles.notificationIcon} ${styles.notificationIconAmber}`}><UtensilsCrossed size={16} /></span><div><strong>{navigationMetrics.activeOrders} đơn căn tin đang xử lý</strong><p>Không gồm đơn đã hoàn tất, thanh toán hoặc hủy.</p><small>Mở Vận hành căn tin</small></div></Link> : null}
                  {(navigationMetrics.unreadMessages ?? 0) > 0 ? <Link className={styles.notificationItem} href="/tro-chuyen" onClick={() => setNotificationsOpen(false)}><span className={`${styles.notificationIcon} ${styles.notificationIconBlue}`}><MessageCircle size={16} /></span><div><strong>{navigationMetrics.unreadMessages} tin nhắn chưa đọc</strong><p>Số lượng do API trò chuyện trả về.</p><small>Mở Trò chuyện</small></div></Link> : null}
                  {navigationMetricsLoading ? <div className={styles.notificationEmpty}><span className={styles.notificationLoader} /><p>Đang tải dữ liệu mới nhất...</p></div> : null}
                  {!navigationMetricsLoading && notificationCount === 0 && !navigationMetricsError ? <div className={styles.notificationEmpty}><CheckCircle2 size={18} /><p>Hiện không có nội dung cần xử lý.</p></div> : null}
                  {navigationMetricsError ? <div className={styles.notificationWarning}><Bell size={17} /><p>Một phần dữ liệu chưa tải được. Các bộ đếm lỗi đã được ẩn.</p></div> : null}
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
