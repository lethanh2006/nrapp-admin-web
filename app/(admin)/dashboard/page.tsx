"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  MessageSquareText,
  Sparkles,
  UserRoundPlus,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { gatewayApi } from "@/lib/api/gateway";
import { toCanteenOrder, toEmployee, toScheduleRequest, toTask, unwrapData, type ApiAttendance, type ApiOrderPage, type ApiScheduleRequest, type ApiTaskPage, type ApiUser } from "@/lib/api/domain";
import type { CanteenOrder, Employee, ScheduleRequest, Task } from "@/lib/types";
import type { BadgeTone } from "@/lib/types";
import styles from "./dashboard.module.css";

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const quickTools: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: "red" | "blue" | "violet" | "amber";
}[] = [
  {
    title: "Tạo công việc",
    description: "Giao việc và đặt thời hạn",
    href: "/cong-viec",
    icon: ClipboardCheck,
    tone: "red",
  },
  {
    title: "Duyệt lịch làm",
    description: "Xử lý yêu cầu ca làm",
    href: "/lich-lam",
    icon: CalendarCheck2,
    tone: "blue",
  },
  {
    title: "Thêm nhân sự",
    description: "Tạo hồ sơ thành viên mới",
    href: "/nhan-su",
    icon: UserRoundPlus,
    tone: "violet",
  },
  {
    title: "Theo dõi căn tin",
    description: "Kiểm tra đơn đang phục vụ",
    href: "/can-tin",
    icon: UtensilsCrossed,
    tone: "amber",
  },
];

const requestTones: BadgeTone[] = ["red", "violet", "cyan"];

export default function DashboardPage() {
  const { user } = useAuthSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequest[]>([]);
  const [canteenOrders, setCanteenOrders] = useState<CanteenOrder[]>([]);
  const [attendance, setAttendance] = useState<ApiAttendance[]>([]);

  const loadDashboard = useCallback(async () => {
      const reportFrom = new Date();
      reportFrom.setDate(reportFrom.getDate() - 6);
      const [usersResult, tasksResult, schedulesResult, ordersResult, attendanceResult] = await Promise.allSettled([
        gatewayApi<{ users: ApiUser[] }>("user/user/all"),
        gatewayApi<ApiTaskPage>("todo?limit=100"),
        gatewayApi<ApiScheduleRequest[] | { data: ApiScheduleRequest[] }>("workschedule/schedule/pending"),
        gatewayApi<ApiOrderPage>("canteen/orders?limit=100"),
        gatewayApi<ApiAttendance[] | { data: ApiAttendance[] }>(`workschedule/attendance/report?from=${encodeURIComponent(reportFrom.toISOString())}&to=${encodeURIComponent(new Date().toISOString())}`),
      ]);
      if (usersResult.status === "fulfilled") setEmployees((usersResult.value.users ?? []).map(toEmployee));
      if (tasksResult.status === "fulfilled") setTasks((tasksResult.value.tasks ?? []).map(toTask).filter((task): task is Task => task !== null));
      if (schedulesResult.status === "fulfilled") setScheduleRequests(unwrapData(schedulesResult.value).map(toScheduleRequest));
      if (ordersResult.status === "fulfilled") setCanteenOrders((ordersResult.value.orders ?? []).map(toCanteenOrder).filter((order): order is CanteenOrder => order !== null));
      if (attendanceResult.status === "fulfilled") setAttendance(unwrapData(attendanceResult.value));
  }, []);

  useEffect(() => { void Promise.resolve().then(loadDashboard); }, [loadDashboard]);

  const activeEmployees = employees.length;
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const pendingRequests = scheduleRequests.filter((request) => request.status === "pending");
  const activeOrders = canteenOrders.filter((order) => order.status !== "completed").length;
  const weeklyAttendance = dayLabels.map((_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - 6 + index);
    const iso = date.toISOString().slice(0, 10);
    const present = new Set(attendance.filter((item) => item.date.slice(0, 10) === iso && item.check_in_at).map((item) => item.employee_id)).size;
    return Math.round((present / Math.max(employees.length, 1)) * 100);
  });
  const attendanceAverage = Math.round(
    weeklyAttendance.reduce((total, value) => total + value, 0) / weeklyAttendance.length,
  );
  const chartPoints = weeklyAttendance
    .map((value, index) => `${index * 100},${118 - value}`)
    .join(" ");
  const chartArea = `0,112 ${chartPoints} 600,112`;
  const todayIso = new Date().toISOString().slice(0, 10);
  const checkedInToday = new Set(attendance.filter((item) => item.date.slice(0, 10) === todayIso && item.check_in_at).map((item) => item.employee_id)).size;
  const greeting = new Date().getHours() < 12 ? "Chào buổi sáng" : new Date().getHours() < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  const kpis = [
    {
      label: "Hồ sơ nhân sự",
      value: employees.length.toString().padStart(2, "0"),
      helper: `${activeEmployees} tài khoản hiện có`,
      trend: "Đồng bộ trực tiếp",
      icon: UsersRound,
      tone: "red" as const,
    },
    {
      label: "Công việc đang mở",
      value: openTasks.toString().padStart(2, "0"),
      helper: "trên toàn bộ phận",
      trend: `${tasks.filter((task) => task.status === "done").length} đã hoàn thành`,
      icon: ClipboardCheck,
      tone: "blue" as const,
    },
    {
      label: "Yêu cầu chờ duyệt",
      value: pendingRequests.length.toString().padStart(2, "0"),
      helper: "cần xử lý hôm nay",
      trend: "Ưu tiên",
      trendDirection: "down" as const,
      icon: Clock3,
      tone: "amber" as const,
    },
    {
      label: "Đơn căn tin mở",
      value: activeOrders.toString().padStart(2, "0"),
      helper: `${canteenOrders.length} đơn được trả về`,
      trend: "Dữ liệu hiện tại",
      icon: UtensilsCrossed,
      tone: "emerald" as const,
    },
  ];

  const recentActivity = [
    tasks[0] ? {
      title: "Cập nhật tiến độ công việc",
      detail: `${tasks[0].assignee} · ${tasks[0].id}`,
      time: tasks[0].due,
      icon: ClipboardCheck,
      tone: "red",
    } : null,
    scheduleRequests[0] ? {
      title: "Gửi yêu cầu lịch làm mới",
      detail: `${scheduleRequests[0].employee} · ${scheduleRequests[0].id}`,
      time: scheduleRequests[0].submittedAt,
      icon: CalendarDays,
      tone: "blue",
    } : null,
    canteenOrders[0] ? {
      title: "Ghi nhận đơn căn tin",
      detail: `${canteenOrders[0].customer} · ${canteenOrders[0].code}`,
      time: canteenOrders[0].createdAt,
      icon: UtensilsCrossed,
      tone: "amber",
    } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} /> Trung tâm vận hành trực tuyến
          </span>
          <p className={styles.heroEyebrow}>{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "long" }).format(new Date())}</p>
          <h1>
            {greeting},
            <br />
            <span>{user?.name ?? "Quản trị viên"}.</span>
          </h1>
          <p className={styles.heroDescription}>
            Dữ liệu được đồng bộ từ NRApp Gateway. Bạn có {pendingRequests.length} yêu cầu lịch làm đang chờ duyệt.
          </p>
          <div className={styles.heroActions}>
            <Link href="/lich-lam" className={styles.heroPrimaryAction}>
              Duyệt yêu cầu <ArrowRight size={16} />
            </Link>
            <Link href="/cong-viec" className={styles.heroSecondaryAction}>
              Xem công việc
            </Link>
          </div>
        </div>

        <div className={styles.heroSnapshot}>
          <div className={styles.snapshotTop}>
            <span className={styles.snapshotIcon}>
              <Sparkles size={17} />
            </span>
            <div>
              <small>NHỊP VẬN HÀNH</small>
              <strong>{attendanceAverage >= 80 ? "Ổn định" : "Cần theo dõi"}</strong>
            </div>
            <Badge tone="emerald" dot>
              {attendanceAverage >= 80 ? "Tốt" : "Theo dõi"}
            </Badge>
          </div>
          <div className={styles.snapshotScore}>
            <strong>{attendanceAverage}%</strong>
            <span>hiện diện 7 ngày</span>
          </div>
          <div className={styles.snapshotTrack}>
            <span style={{ width: `${attendanceAverage}%` }} />
          </div>
          <div className={styles.snapshotMeta}>
            <span>
              <CheckCircle2 size={14} /> {checkedInToday} đã check-in hôm nay
            </span>
            <span>{Math.max(employees.length - checkedInToday, 0)} chưa ghi nhận</span>
          </div>
        </div>
      </section>

      <section className={styles.statsGrid} aria-label="Chỉ số vận hành">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <StatCard
              key={item.label}
              label={item.label}
              value={item.value}
              helper={item.helper}
              trend={item.trend}
              trendDirection={item.trendDirection}
              tone={item.tone}
              icon={<Icon size={18} />}
            />
          );
        })}
      </section>

      <section className={styles.dashboardGrid}>
        <article className={styles.chartCard}>
          <SectionHeading
            title="Tỷ lệ chấm công"
            description="Mức hiện diện trong 7 ngày gần nhất"
            href="/lich-lam"
            linkLabel="Chi tiết"
          />

          <div className={styles.chartSummary}>
            <div>
              <strong>{attendanceAverage}%</strong>
              <span>trung bình tuần</span>
            </div>
            <span className={styles.chartTrend}>Dữ liệu NRApp Gateway</span>
          </div>

          <div className={styles.chartFrame}>
            <div className={styles.yAxis} aria-hidden="true">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
            </div>
            <div className={styles.chartCanvas}>
              <svg
                viewBox="0 0 600 120"
                preserveAspectRatio="none"
                role="img"
                aria-label="Biểu đồ tỷ lệ chấm công từ thứ Hai đến Chủ nhật"
              >
                <defs>
                  <linearGradient id="attendanceArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[18, 43, 68, 93].map((position) => (
                  <line
                    key={position}
                    x1="0"
                    x2="600"
                    y1={position}
                    y2={position}
                    className={styles.gridLine}
                  />
                ))}
                <polygon points={chartArea} fill="url(#attendanceArea)" />
                <polyline points={chartPoints} className={styles.chartLine} />
                {weeklyAttendance.map((value, index) => (
                  <g key={dayLabels[index]}>
                    <circle cx={index * 100} cy={118 - value} r="7" className={styles.chartHalo} />
                    <circle cx={index * 100} cy={118 - value} r="3.5" className={styles.chartDot} />
                  </g>
                ))}
              </svg>
              <div className={styles.xAxis} aria-hidden="true">
                {dayLabels.map((day, index) => (
                  <span className={index === 4 ? styles.activeDay : ""} key={day}>
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.chartFooter}>
            <span>
              <i className={styles.legendPrimary} /> Đã chấm công
            </span>
            <span>
              <i className={styles.legendMuted} /> Cuối tuần
            </span>
            <small>Cập nhật {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date())}</small>
          </div>
        </article>

        <article className={styles.requestCard}>
          <SectionHeading
            title="Chờ phê duyệt"
            description="Các yêu cầu mới nhất từ nhân sự"
            href="/lich-lam"
          />
          <div className={styles.requestList}>
            {pendingRequests.slice(0, 3).map((request, index) => (
              <Link href="/lich-lam" className={styles.requestItem} key={request.id}>
                <Avatar initials={request.initial} tone={requestTones[index]} size="md" />
                <span className={styles.requestCopy}>
                  <span className={styles.requestNameRow}>
                    <strong>{request.employee}</strong>
                    <small>{request.submittedAt}</small>
                  </span>
                  <span className={styles.requestKind}>{request.kind}</span>
                  <span className={styles.requestSchedule}>{request.schedule}</span>
                </span>
                <ChevronRight className={styles.requestArrow} size={17} />
              </Link>
            ))}
          </div>
          <Link href="/lich-lam" className={styles.reviewAllButton}>
            Xử lý {pendingRequests.length} yêu cầu <ArrowRight size={15} />
          </Link>
        </article>
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.toolsPanel}>
          <SectionHeading
            title="Thao tác nhanh"
            description="Lối tắt cho những tác vụ thường dùng"
            href="/tien-ich"
            linkLabel="Tất cả tiện ích"
          />
          <div className={styles.quickToolGrid}>
            {quickTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link href={tool.href} className={styles.quickTool} key={tool.title}>
                  <span className={`${styles.quickToolIcon} ${styles[`quickToolIcon_${tool.tone}`]}`}>
                    <Icon size={19} />
                  </span>
                  <span className={styles.quickToolCopy}>
                    <strong>{tool.title}</strong>
                    <small>{tool.description}</small>
                  </span>
                  <ChevronRight size={17} />
                </Link>
              );
            })}
          </div>
        </article>

        <article className={styles.activityPanel}>
          <SectionHeading
            title="Hoạt động gần đây"
            description="Cập nhật trên toàn hệ thống"
            href="/tro-chuyen"
            linkLabel="Trao đổi"
          />
          <div className={styles.activityList}>
            {recentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div className={styles.activityItem} key={activity.title}>
                  <span className={`${styles.activityIcon} ${styles[`activityIcon_${activity.tone}`]}`}>
                    <Icon size={15} />
                  </span>
                  <span className={styles.activityCopy}>
                    <strong>{activity.title}</strong>
                    <span>{activity.detail}</span>
                    <small>{activity.time}</small>
                  </span>
                </div>
              );
            })}
          </div>
          <Link href="/tro-chuyen" className={styles.activityCta}>
            <MessageSquareText size={15} /> Mở trò chuyện nội bộ
          </Link>
        </article>
      </section>
    </div>
  );
}
