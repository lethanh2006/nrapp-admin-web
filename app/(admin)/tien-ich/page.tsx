"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ContactRound,
  Database,
  Fingerprint,
  Gauge,
  MessageSquareMore,
  ServerCog,
  ShieldCheck,
  Sparkles,
  UserCog,
  UtensilsCrossed,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { useCallback, useEffect, useMemo, useState } from "react";
import { gatewayApi } from "@/lib/api/gateway";
import { unwrapData, type ApiChatListItem, type ApiOrderPage, type ApiScheduleRequest, type ApiTaskPage, type ApiUser } from "@/lib/api/domain";
import type { BadgeTone } from "@/lib/types";
import styles from "./tien-ich.module.css";

type ToolAccent = "red" | "blue" | "violet" | "amber" | "emerald" | "slate";

type Tool = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: ToolAccent;
  meta: string;
  tone: BadgeTone;
  featured?: boolean;
};

export default function UtilitiesPage() {
  const [metrics, setMetrics] = useState({ openTasks: 0, pendingRequests: 0, employees: 0, activeOrders: 0, unreadMessages: 0 });
  const [services, setServices] = useState({ data: false, attendance: false, canteen: false });
  const [lastSync, setLastSync] = useState("");

  const loadOverview = useCallback(async () => {
    const results = await Promise.allSettled([
      gatewayApi<ApiTaskPage>("todo?limit=100"),
      gatewayApi<ApiScheduleRequest[] | { data: ApiScheduleRequest[] }>("workschedule/schedule/all"),
      gatewayApi<{ users: ApiUser[] }>("user/user/all"),
      gatewayApi<ApiOrderPage>("canteen/orders?limit=100"),
      gatewayApi<{ chats: ApiChatListItem[] }>("chat/chat/all"),
    ]);
    const [tasksResult, schedulesResult, usersResult, ordersResult, chatsResult] = results;
    setMetrics({
      openTasks: tasksResult.status === "fulfilled" ? (tasksResult.value.tasks ?? []).filter((item) => !["done", "cancelled"].includes(item.status)).length : 0,
      pendingRequests: schedulesResult.status === "fulfilled" ? unwrapData(schedulesResult.value).filter((item) => item.status === "pending").length : 0,
      employees: usersResult.status === "fulfilled" ? (usersResult.value.users ?? []).length : 0,
      activeOrders: ordersResult.status === "fulfilled" ? (ordersResult.value.orders ?? []).filter((item) => !["COMPLETED", "PAID", "CANCELLED"].includes(item.status)).length : 0,
      unreadMessages: chatsResult.status === "fulfilled" ? (chatsResult.value.chats ?? []).reduce((total, item) => total + (item.chat.unseenCount ?? 0), 0) : 0,
    });
    setServices({
      data: tasksResult.status === "fulfilled" && usersResult.status === "fulfilled",
      attendance: schedulesResult.status === "fulfilled",
      canteen: ordersResult.status === "fulfilled",
    });
    setLastSync(new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadOverview);
    const timer = window.setInterval(() => void loadOverview(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadOverview]);

  const { openTasks, pendingRequests, employees: activeEmployees, activeOrders, unreadMessages } = metrics;

  const tools: Tool[] = [
    {
      title: "Điều phối công việc",
      description: "Tạo, giao việc, theo dõi tiến độ và cân đối nguồn lực giữa các bộ phận.",
      href: "/cong-viec",
      icon: ClipboardList,
      accent: "red",
      meta: `${openTasks} việc đang mở`,
      tone: "red",
      featured: true,
    },
    {
      title: "Lịch & chấm công",
      description: "Xếp ca, duyệt thay đổi lịch và theo dõi dữ liệu chấm công theo thời gian thực.",
      href: "/lich-lam",
      icon: CalendarClock,
      accent: "blue",
      meta: `${pendingRequests} yêu cầu chờ`,
      tone: "amber",
    },
    {
      title: "Danh bạ nhân sự",
      description: "Tra cứu hồ sơ, vai trò, bộ phận và trạng thái làm việc của toàn đội ngũ.",
      href: "/nhan-su",
      icon: ContactRound,
      accent: "violet",
      meta: `${activeEmployees} người hoạt động`,
      tone: "violet",
    },
    {
      title: "Vận hành căn tin",
      description: "Kiểm soát luồng đơn hàng, trạng thái chế biến và doanh thu trong ngày.",
      href: "/can-tin",
      icon: UtensilsCrossed,
      accent: "amber",
      meta: `${activeOrders} đơn đang xử lý`,
      tone: "amber",
    },
    {
      title: "Trò chuyện nội bộ",
      description: "Kết nối nhanh với nhân sự và giữ thông tin vận hành trong cùng một không gian.",
      href: "/tro-chuyen",
      icon: MessageSquareMore,
      accent: "emerald",
      meta: `${unreadMessages} tin chưa đọc`,
      tone: "emerald",
    },
    {
      title: "Hồ sơ quản trị",
      description: "Cập nhật thông tin cá nhân, thiết lập bảo mật và tùy chọn tài khoản.",
      href: "/ho-so",
      icon: UserCog,
      accent: "slate",
      meta: "Bảo mật tốt",
      tone: "slate",
    },
  ];

  const systemServices = useMemo(() => [
    {
      label: "Dữ liệu công việc & nhân sự",
      detail: services.data ? "Kết nối thành công" : "Không thể kết nối",
      value: services.data ? 100 : 0,
      icon: Database,
      tone: services.data ? "emerald" : "slate",
    },
    {
      label: "Dịch vụ lịch & chấm công",
      detail: services.attendance ? "Kết nối thành công" : "Không thể kết nối",
      value: services.attendance ? 100 : 0,
      icon: Fingerprint,
      tone: services.attendance ? "blue" : "slate",
    },
    {
      label: "Dịch vụ căn tin",
      detail: services.canteen ? "Kết nối thành công" : "Không thể kết nối",
      value: services.canteen ? 100 : 0,
      icon: BellRing,
      tone: services.canteen ? "violet" : "slate",
    },
  ], [services]);
  const healthyServices = systemServices.filter((service) => service.value === 100).length;
  const healthScore = Math.round((healthyServices / systemServices.length) * 100);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Workspace / Công cụ"
        title="Trung tâm tiện ích"
        description="Truy cập nhanh mọi công cụ điều hành và theo dõi sức khỏe hệ thống từ một nơi."
        actions={
          <Link href="/dashboard" className="button-secondary">
            <ArrowLeft size={16} /> Về bảng điều hành
          </Link>
        }
      />

      <section className={styles.introCard}>
        <div className={styles.introCopy}>
          <span className={styles.introIcon}>
            <Sparkles size={20} />
          </span>
          <div>
            <p>KHÔNG GIAN LÀM VIỆC THÔNG MINH</p>
            <h2>Mọi tác vụ, đúng nơi bạn cần.</h2>
            <span>
              Các tiện ích được sắp xếp theo luồng vận hành hằng ngày để bạn xử lý công việc
              nhanh hơn và ít chuyển màn hình hơn.
            </span>
          </div>
        </div>
        <div className={styles.introStatus}>
          <span className={styles.statusPulse} />
          <span>
            <small>TRẠNG THÁI HỆ THỐNG</small>
            <strong>{healthyServices === systemServices.length ? "Các API chính đang hoạt động" : `${healthyServices}/${systemServices.length} nhóm API kết nối được`}</strong>
          </span>
          <CheckCircle2 size={20} />
        </div>
      </section>

      <section>
        <SectionHeading
          title="Bộ công cụ quản trị"
          description="Chọn một tiện ích để bắt đầu xử lý công việc"
        />
        <div className={styles.toolGrid}>
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                href={tool.href}
                className={`${styles.toolCard} ${tool.featured ? styles.toolCardFeatured : ""}`}
                key={tool.title}
              >
                <div className={styles.toolTop}>
                  <span className={`${styles.toolIcon} ${styles[`toolIcon_${tool.accent}`]}`}>
                    <Icon size={23} />
                  </span>
                  {tool.featured ? (
                    <Badge tone="red" dot>
                      Dùng nhiều
                    </Badge>
                  ) : (
                    <span className={styles.openIcon}>
                      <ArrowUpRight size={17} />
                    </span>
                  )}
                </div>
                <h3>{tool.title}</h3>
                <p>{tool.description}</p>
                <div className={styles.toolFooter}>
                  <Badge tone={tool.tone} dot>
                    {tool.meta}
                  </Badge>
                  <span>
                    Mở tiện ích <ArrowUpRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.systemGrid}>
        <article className={styles.healthCard}>
          <div className={styles.healthHeading}>
            <div>
              <p>SỨC KHỎE HỆ THỐNG</p>
              <h2>Dịch vụ vận hành</h2>
              <span>Cập nhật tự động mỗi 60 giây</span>
            </div>
            <Badge tone="emerald" dot>
              {healthyServices === systemServices.length ? "Đang ổn định" : "Cần kiểm tra"}
            </Badge>
          </div>

          <div className={styles.healthContent}>
            <div className={styles.healthScore}>
              <div className={styles.healthRing}>
                <span>
                  <strong>{healthScore}</strong>
                  <small>/ 100</small>
                </span>
              </div>
              <div>
                <strong>{healthyServices === systemServices.length ? "Gateway phản hồi đầy đủ" : "Một số API chưa phản hồi"}</strong>
                <p>Điểm số được tính trực tiếp từ kết quả gọi API mới nhất.</p>
                <span>
                  <ShieldCheck size={14} /> Được bảo vệ &amp; đồng bộ
                </span>
              </div>
            </div>

            <div className={styles.serviceList}>
              {systemServices.map((service) => {
                const Icon = service.icon;
                return (
                  <div className={styles.serviceItem} key={service.label}>
                    <span className={`${styles.serviceIcon} ${styles[`serviceIcon_${service.tone}`]}`}>
                      <Icon size={16} />
                    </span>
                    <span className={styles.serviceCopy}>
                      <span>
                        <strong>{service.label}</strong>
                        <small>{service.value}%</small>
                      </span>
                      <small>{service.detail}</small>
                      <i>
                        <b style={{ width: `${service.value}%` }} />
                      </i>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <aside className={styles.summaryCard}>
          <div className={styles.summaryHeading}>
            <span>
              <Gauge size={19} />
            </span>
            <div>
              <p>TỔNG QUAN NHANH</p>
              <h2>Hôm nay</h2>
            </div>
          </div>

          <div className={styles.summaryMetrics}>
            <div>
              <span>Yêu cầu chờ</span>
              <strong>{pendingRequests.toString().padStart(2, "0")}</strong>
            </div>
            <div>
              <span>Việc đang mở</span>
              <strong>{openTasks.toString().padStart(2, "0")}</strong>
            </div>
            <div>
              <span>Tài khoản nhân sự</span>
              <strong>{activeEmployees.toString().padStart(2, "0")}</strong>
            </div>
            <div>
              <span>Đơn đang xử lý</span>
              <strong>{activeOrders.toString().padStart(2, "0")}</strong>
            </div>
          </div>

          <div className={styles.backupNote}>
            <span className={styles.backupIcon}>
              <ServerCog size={17} />
            </span>
            <span>
              <small>ĐỒNG BỘ API GẦN NHẤT</small>
              <strong>{lastSync || "Đang kết nối..."}</strong>
            </span>
            <Badge tone={healthyServices === systemServices.length ? "emerald" : "amber"}>{healthyServices === systemServices.length ? "Hoàn tất" : "Một phần"}</Badge>
          </div>

          <Link href="/tro-chuyen" className={styles.supportLink}>
            <Wifi size={15} /> Liên hệ hỗ trợ vận hành <ArrowUpRight size={14} />
          </Link>
        </aside>
      </section>
    </div>
  );
}
