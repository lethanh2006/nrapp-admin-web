"use client";

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Clock3,
  CookingPot,
  Download,
  Flame,
  Gauge,
  Package,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Soup,
  TrendingUp,
  TriangleAlert,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { gatewayApi } from "@/lib/api/gateway";
import { toCanteenOrder, type ApiExpiryAlert, type ApiIngredient, type ApiListResponse, type ApiMenuCatalog, type ApiOrder, type ApiOrderPage, type ApiTopDish } from "@/lib/api/domain";
import { notifyNavigationMetricsChanged } from "@/lib/navigation-metrics";
import type { BadgeTone, CanteenOrder } from "@/lib/types";
import styles from "./can-tin.module.css";

type CanteenTab = "orders" | "kitchen" | "menu" | "inventory" | "analytics";
type OrderFilter = CanteenOrder["status"] | "all";
type PaymentFilter = CanteenOrder["payment"] | "all";
type StockFilter = "all" | "low" | "good";

type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  sold: number;
  available: boolean;
  prep: string;
  tone: "red" | "amber" | "emerald" | "violet" | "cyan";
};

type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  capacity: number;
  minimum: number;
  updatedAt: string;
  supplier: string;
};

const tabs: { value: CanteenTab; label: string; helper: string; icon: typeof ReceiptText }[] = [
  { value: "orders", label: "Đơn hàng", helper: "Tiếp nhận & phục vụ", icon: ReceiptText },
  { value: "kitchen", label: "Nhà bếp", helper: "Điều phối chế biến", icon: CookingPot },
  { value: "menu", label: "Thực đơn", helper: "Món & giá bán", icon: UtensilsCrossed },
  { value: "inventory", label: "Kho", helper: "Nguyên liệu", icon: Warehouse },
  { value: "analytics", label: "Thống kê", helper: "Hiệu suất bán hàng", icon: BarChart3 },
];

const statusMeta: Record<
  CanteenOrder["status"],
  { label: string; shortLabel: string; tone: BadgeTone; next?: CanteenOrder["status"]; action?: string }
> = {
  new: { label: "Đơn mới", shortLabel: "Mới", tone: "red", next: "confirmed", action: "Xác nhận" },
  confirmed: { label: "Đã xác nhận", shortLabel: "Chờ bếp", tone: "blue", next: "cooking", action: "Chuyển bếp" },
  cooking: { label: "Đang chế biến", shortLabel: "Đang nấu", tone: "amber", next: "ready", action: "Báo xong" },
  ready: { label: "Sẵn sàng giao", shortLabel: "Sẵn sàng", tone: "emerald", next: "completed", action: "Hoàn tất" },
  completed: { label: "Đã hoàn tất", shortLabel: "Hoàn tất", tone: "slate" },
};

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

function revenueSeries(orders: ApiOrder[], range: "7 ngày" | "30 ngày" | "Quý này") {
  const bucketCount = range === "7 ngày" ? 7 : range === "30 ngày" ? 4 : 3;
  const bucketDays = range === "7 ngày" ? 1 : range === "30 ngày" ? 7 : 30;
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const amounts = Array.from({ length: bucketCount }, (_, index) => {
    const end = new Date(now);
    end.setDate(now.getDate() - (bucketCount - index - 1) * bucketDays);
    const start = new Date(end);
    start.setDate(end.getDate() - bucketDays + 1);
    start.setHours(0, 0, 0, 0);
    const amount = orders.filter((order) => order.paymentStatus === "PAID" && new Date(order.createdAt) >= start && new Date(order.createdAt) <= end).reduce((sum, order) => sum + order.finalAmount, 0);
    const label = range === "7 ngày" ? new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(end) : range === "30 ngày" ? `Tuần ${index + 1}` : `T${new Intl.DateTimeFormat("vi-VN", { month: "2-digit" }).format(end)}`;
    return { label, amount };
  });
  const maximum = Math.max(...amounts.map((item) => item.amount), 1);
  return amounts.map((item) => ({ ...item, value: Math.round((item.amount / maximum) * 100) }));
}

export default function CanteenPage() {
  const [activeTab, setActiveTab] = useState<CanteenTab>("orders");
  const [orders, setOrders] = useState<CanteenOrder[]>([]);
  const [apiOrders, setApiOrders] = useState<ApiOrder[]>([]);
  const [orderQuery, setOrderQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuQuery, setMenuQuery] = useState("");
  const [menuCategory, setMenuCategory] = useState("Tất cả");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [topDishes, setTopDishes] = useState<ApiTopDish[]>([]);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [analyticsRange, setAnalyticsRange] = useState("7 ngày");
  const [notice, setNotice] = useState("");

  const loadCanteen = useCallback(async () => {
    try {
      const [orderResult, catalog, ingredientResult, alerts, dishes] = await Promise.all([
        gatewayApi<ApiOrderPage>("canteen/orders?limit=100"),
        gatewayApi<ApiMenuCatalog>("canteen/admin/menu"),
        gatewayApi<ApiListResponse<ApiIngredient>>("canteen/inventory/ingredients?limit=100"),
        gatewayApi<ApiExpiryAlert[]>("canteen/inventory/expiry-alerts"),
        gatewayApi<ApiTopDish[]>("canteen/analytics/top-dishes?limit=10"),
      ]);
      const rawOrders = Array.isArray(orderResult.orders) ? orderResult.orders : [];
      setApiOrders(rawOrders);
      setOrders(rawOrders.map(toCanteenOrder).filter((order): order is CanteenOrder => order !== null));
      const sales = new Map((Array.isArray(dishes) ? dishes : []).map((item) => [item.menuItemId, item.salesCount]));
      const categoryNames = new Map((catalog.categories ?? []).map((item) => [item._id, item.name]));
      const tones: MenuItem["tone"][] = ["red", "amber", "emerald", "violet", "cyan"];
      setMenu((catalog.items ?? []).map((item, index) => ({ id: item._id, name: item.name, category: categoryNames.get(item.categoryId) ?? "Chưa phân loại", price: item.price, sold: sales.get(item._id) ?? 0, available: item.isAvailable, prep: "Chưa có dữ liệu", tone: tones[index % tones.length] })));
      setTopDishes(Array.isArray(dishes) ? dishes : []);
      const expiryRows = Array.isArray(alerts) ? alerts : [];
      setInventory((ingredientResult.data ?? []).map((item) => {
        const batches = expiryRows.filter((batch) => batch.ingredientId === item._id);
        const quantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);
        const capacity = Math.max(batches.reduce((sum, batch) => sum + batch.originalQuantity, 0), item.minimumThreshold, 1);
        return { id: item._id, name: item.name, unit: item.unit, quantity, capacity, minimum: item.minimumThreshold, updatedAt: item.updatedAt ? new Intl.DateTimeFormat("vi-VN").format(new Date(item.updatedAt)) : "Chưa cập nhật", supplier: batches.find((batch) => batch.supplier)?.supplier ?? "Chưa cập nhật" };
      }));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể tải dữ liệu căn tin."); }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadCanteen); }, [loadCanteen]);

  const visibleOrders = useMemo(() => {
    const query = normalizeSearch(orderQuery);
    return orders.filter((order) => {
      const matchesQuery = !query || normalizeSearch([order.code, order.customer, order.table, ...order.items].join(" ")).includes(query);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPayment = paymentFilter === "all" || order.payment === paymentFilter;
      return matchesQuery && matchesStatus && matchesPayment;
    });
  }, [orderQuery, orders, paymentFilter, statusFilter]);

  const categories = useMemo(() => ["Tất cả", ...Array.from(new Set(menu.map((item) => item.category)))], [menu]);
  const visibleMenu = useMemo(() => {
    const query = normalizeSearch(menuQuery);
    return menu.filter((item) => {
      const matchesQuery = !query || normalizeSearch(`${item.name} ${item.category}`).includes(query);
      return matchesQuery && (menuCategory === "Tất cả" || item.category === menuCategory);
    });
  }, [menu, menuCategory, menuQuery]);

  const visibleInventory = useMemo(
    () => inventory.filter((item) => stockFilter === "all" || (stockFilter === "low" ? item.quantity <= item.minimum : item.quantity > item.minimum)),
    [inventory, stockFilter],
  );

  const chartData: { [range: string]: Array<{ label: string; amount: number; value: number }> } = useMemo(() => ({
    "7 ngày": revenueSeries(apiOrders, "7 ngày"),
    "30 ngày": revenueSeries(apiOrders, "30 ngày"),
    "Quý này": revenueSeries(apiOrders, "Quý này"),
  }), [apiOrders]);

  const updateOrderStatus = async (order: CanteenOrder, next: CanteenOrder["status"]) => {
    const endpoint = next === "confirmed" ? `canteen/orders/${order.id}/confirm` : next === "cooking" ? `canteen/kitchen/orders/${order.id}/cooking` : next === "ready" ? `canteen/kitchen/orders/${order.id}/ready` : `canteen/orders/${order.id}/complete`;
    try {
      await gatewayApi(endpoint, { method: "PATCH" });
      await loadCanteen();
      notifyNavigationMetricsChanged();
      setNotice(`${order.code} đã chuyển sang “${statusMeta[next].label}”.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật đơn hàng."); }
  };

  const receiveNextOrder = async () => {
    try { await gatewayApi("canteen/kitchen/next", { method: "POST" }); await loadCanteen(); notifyNavigationMetricsChanged(); setNotice("Đã nhận đơn ưu tiên tiếp theo."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể nhận đơn tiếp theo."); }
  };

  const toggleMenuItem = async (id: string) => {
    const item = menu.find((candidate) => candidate.id === id);
    if (!item) return;
    try { await gatewayApi(`canteen/admin/menu/${encodeURIComponent(id)}`, { method: "PUT", json: { isAvailable: !item.available } }); await loadCanteen(); setNotice(`${item.name} đã ${item.available ? "tạm ngưng" : "mở lại"} trên thực đơn.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể cập nhật món ăn."); }
  };

  const restock = (item: InventoryItem) => {
    setNotice(`API nhập lô cần số lượng, hạn dùng và giá vốn cho ${item.name}; hãy dùng biểu mẫu nhập kho đầy đủ.`);
  };

  const resetOrderFilters = () => {
    setOrderQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
  };

  const cookingCount = orders.filter((order) => order.status === "cooking").length;
  const newCount = orders.filter((order) => order.status === "new" || order.status === "confirmed").length;
  const lowStockCount = inventory.filter((item) => item.quantity <= item.minimum).length;
  const revenue = orders.filter((order) => order.payment === "paid").reduce((sum, order) => sum + order.total, 0);
  const completedCount = apiOrders.filter((order) => order.status === "COMPLETED" || order.status === "PAID").length;
  const cancelledCount = apiOrders.filter((order) => order.status === "CANCELLED").length;
  const completionRate = Math.round((completedCount / Math.max(apiOrders.length, 1)) * 100);
  const averageOrder = Math.round(apiOrders.reduce((sum, order) => sum + order.finalAmount, 0) / Math.max(apiOrders.length, 1));
  const timeSlots = [[7, 9], [9, 11], [11, 13], [13, 15]].map(([start, end]) => ({ start, end, count: apiOrders.filter((order) => { const hour = new Date(order.createdAt).getHours(); return hour >= start && hour < end; }).length }));
  const maxSlotCount = Math.max(...timeSlots.map((slot) => slot.count), 1);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Trung tâm vận hành"
        title="Quản lý căn tin"
        description="Theo dõi xuyên suốt từ lúc tiếp nhận đơn đến chế biến, giao món và kiểm soát nguyên liệu trong ngày."
        actions={
          <>
            <button className="button-secondary" type="button" onClick={() => void loadCanteen()}>
              <Download size={16} /> Làm mới dữ liệu
            </button>
            <button className="button-primary" type="button" onClick={() => setActiveTab("menu")}>
              <Plus size={16} /> Quản lý thực đơn
            </button>
          </>
        }
      />

      {notice ? (
        <div className={styles.notice} role="status">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo">Đóng</button>
        </div>
      ) : null}

      <section className={styles.statsGrid} aria-label="Tổng quan căn tin hôm nay">
        <StatCard label="Đơn hiện có" value={orders.length} helper="theo dữ liệu máy chủ" icon={<ShoppingBag size={18} />} tone="red" />
        <StatCard label="Đang chờ xử lý" value={newCount} helper="cần được tiếp nhận" icon={<Clock3 size={18} />} tone="amber" />
        <StatCard label="Đang chế biến" value={cookingCount} helper="theo trạng thái máy chủ" icon={<ChefHat size={18} />} tone="blue" />
        <StatCard label="Doanh thu dữ liệu" value={money.format(revenue)} helper="các đơn đã thanh toán" icon={<CircleDollarSign size={18} />} tone="emerald" />
      </section>

      <nav className={styles.tabBar} aria-label="Phân hệ căn tin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.value;
          return (
            <button
              className={`${styles.tabButton} ${active ? styles.tabButtonActive : ""}`}
              type="button"
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.tabIcon}><Icon size={18} /></span>
              <span><strong>{tab.label}</strong><small>{tab.helper}</small></span>
              {tab.value === "orders" && newCount > 0 ? <b>{newCount}</b> : null}
              {tab.value === "inventory" && lowStockCount > 0 ? <b>{lowStockCount}</b> : null}
            </button>
          );
        })}
      </nav>

      {activeTab === "orders" ? (
        <section className={`surface-card ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Dòng đơn hàng trực tiếp</span>
              <h2>Đơn hàng trong ca</h2>
              <p>Cập nhật trạng thái để đồng bộ ngay với quầy phục vụ và nhà bếp.</p>
            </div>
            <div className={styles.liveLabel}><span /> Đang cập nhật</div>
          </div>

          <div className={styles.toolbar}>
            <label className={styles.searchField}>
              <Search size={17} />
              <span className="sr-only">Tìm đơn hàng</span>
              <input value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="Mã đơn, khách hàng, bàn..." />
            </label>
            <label className={styles.selectWrap}>
              <span className="sr-only">Lọc trạng thái đơn hàng</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OrderFilter)}>
                <option value="all">Tất cả trạng thái</option>
                {Object.entries(statusMeta).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}
              </select>
            </label>
            <label className={styles.selectWrap}>
              <span className="sr-only">Lọc thanh toán</span>
              <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)}>
                <option value="all">Mọi thanh toán</option>
                <option value="paid">Đã thanh toán</option>
                <option value="unpaid">Chưa thanh toán</option>
              </select>
            </label>
            {(orderQuery || statusFilter !== "all" || paymentFilter !== "all") ? (
              <button className={styles.resetButton} type="button" onClick={resetOrderFilters}><RefreshCw size={14} /> Đặt lại</button>
            ) : null}
          </div>

          <div className={styles.resultMeta}>
            <span>Hiển thị <strong>{visibleOrders.length}</strong> / {orders.length} đơn trong ca</span>
            <span className={styles.updatedText}><Clock3 size={13} /> Cập nhật lúc 11:45</span>
          </div>

          <div className={styles.orderTable}>
            <div className={`${styles.orderRow} ${styles.orderHead}`}>
              <span>Đơn hàng</span><span>Khách / vị trí</span><span>Món gọi</span><span>Thanh toán</span><span>Trạng thái</span><span>Thao tác</span>
            </div>
            {visibleOrders.map((order) => {
              const meta = statusMeta[order.status];
              return (
                <article className={styles.orderRow} key={order.id}>
                  <div className={styles.orderIdentity}>
                    <span className={styles.orderIcon}><ReceiptText size={17} /></span>
                    <span><strong>{order.code}</strong><small>{order.createdAt} · {money.format(order.total)}</small></span>
                  </div>
                  <div className={styles.orderCustomer} data-label="Khách / vị trí">
                    <strong>{order.customer}</strong><small>{order.table}</small>
                  </div>
                  <div className={styles.orderItems} data-label="Món gọi">
                    <strong>{order.items[0]}</strong>{order.items.length > 1 ? <small>+{order.items.length - 1} món khác</small> : <small>1 món</small>}
                  </div>
                  <div data-label="Thanh toán">
                    <Badge tone={order.payment === "paid" ? "emerald" : "amber"} dot>{order.payment === "paid" ? "Đã trả" : "Chưa trả"}</Badge>
                  </div>
                  <div data-label="Trạng thái"><Badge tone={meta.tone} dot>{meta.shortLabel}</Badge></div>
                  <div className={styles.rowActions} data-label="Thao tác">
                    {meta.next && meta.action ? (
                      <button className={styles.rowAction} type="button" onClick={() => void updateOrderStatus(order, meta.next!)}>
                        {meta.action}<ArrowRight size={14} />
                      </button>
                    ) : <span className={styles.doneText}><CheckCircle2 size={14} /> Đã đóng đơn</span>}
                  </div>
                </article>
              );
            })}
            {visibleOrders.length === 0 ? (
              <div className={styles.emptyState}><Search size={24} /><strong>Không tìm thấy đơn phù hợp</strong><p>Hãy thay đổi từ khóa hoặc điều kiện lọc.</p><button type="button" onClick={resetOrderFilters}>Xóa bộ lọc</button></div>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "kitchen" ? (
        <section className={styles.kitchenSection}>
          <div className={styles.kitchenHero}>
            <div className={styles.heroIcon}><Flame size={25} /></div>
            <div><span>Kitchen live</span><h2>Điều phối nhà bếp</h2><p>Ưu tiên đơn theo thời gian tiếp nhận và báo món ngay khi sẵn sàng.</p></div>
            <div className={styles.heroMetrics}>
              <span><strong>{orders.filter((order) => order.status === "confirmed").length}</strong><small>Chờ bếp</small></span>
              <span><strong>{cookingCount}</strong><small>Đang nấu</small></span>
              <span><strong>{orders.filter((order) => order.status === "ready").length}</strong><small>Chờ giao</small></span>
            </div>
            <button type="button" onClick={() => void receiveNextOrder()}><CookingPot size={17} /> Nhận đơn tiếp theo</button>
          </div>

          <div className={styles.kitchenBoard}>
            {([
              { status: "confirmed" as const, label: "Chờ tiếp nhận", tone: "blue", icon: Clock3 },
              { status: "cooking" as const, label: "Đang chế biến", tone: "amber", icon: Flame },
              { status: "ready" as const, label: "Sẵn sàng giao", tone: "emerald", icon: CheckCircle2 },
            ]).map((lane) => {
              const laneOrders = orders.filter((order) => order.status === lane.status);
              const Icon = lane.icon;
              return (
                <div className={styles.kitchenLane} key={lane.status}>
                  <header className={`${styles.laneHeader} ${styles[`laneHeader_${lane.tone}`]}`}>
                    <span><Icon size={17} /><strong>{lane.label}</strong></span><b>{laneOrders.length}</b>
                  </header>
                  <div className={styles.laneBody}>
                    {laneOrders.map((order) => {
                      const meta = statusMeta[order.status];
                      return (
                        <article className={styles.kitchenCard} key={order.id}>
                          <div className={styles.kitchenCardTop}><strong>{order.code}</strong><time><Clock3 size={12} /> {order.createdAt}</time></div>
                          <div className={styles.tableChip}>{order.table}</div>
                          <ul>{order.items.map((item) => <li key={item}>{item}</li>)}</ul>
                          <div className={styles.kitchenCardFooter}>
                            <span>{order.customer}</span>
                            {meta.next && meta.action ? <button type="button" onClick={() => void updateOrderStatus(order, meta.next!)}>{meta.action}<ArrowRight size={13} /></button> : null}
                          </div>
                        </article>
                      );
                    })}
                    {laneOrders.length === 0 ? <div className={styles.laneEmpty}><PackageCheck size={22} /><span>Không có đơn</span></div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === "menu" ? (
        <section className={`surface-card ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div><span className={styles.panelEyebrow}>Danh mục bán hôm nay</span><h2>Thực đơn căn tin</h2><p>Bật hoặc tạm ngưng món theo năng lực phục vụ thực tế.</p></div>
            <button className="button-primary" type="button" disabled title="Cần biểu mẫu đầy đủ theo CreateMenuItemDto"><Plus size={16} /> Thêm món</button>
          </div>
          <div className={styles.toolbar}>
            <label className={styles.searchField}><Search size={17} /><span className="sr-only">Tìm món ăn</span><input value={menuQuery} onChange={(event) => setMenuQuery(event.target.value)} placeholder="Tìm tên món..." /></label>
            <label className={styles.selectWrap}><span className="sr-only">Lọc danh mục</span><select value={menuCategory} onChange={(event) => setMenuCategory(event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <span className={styles.toolbarSummary}><strong>{menu.filter((item) => item.available).length}</strong>/{menu.length} món đang mở bán</span>
          </div>
          <div className={styles.menuGrid}>
            {visibleMenu.map((item) => (
              <article className={`${styles.menuCard} ${!item.available ? styles.menuCardDisabled : ""}`} key={item.id}>
                <div className={`${styles.foodVisual} ${styles[`foodVisual_${item.tone}`]}`}><Soup size={27} /><span>{item.category}</span></div>
                <div className={styles.menuCardBody}>
                <div className={styles.menuTitle}><div><h3>{item.name}</h3><p>{money.format(item.price)}</p></div><button className={`${styles.toggle} ${item.available ? styles.toggleActive : ""}`} type="button" role="switch" aria-checked={item.available} onClick={() => void toggleMenuItem(item.id)}><span /></button></div>
                  <div className={styles.menuMeta}><span><Clock3 size={13} /> {item.prep}</span><span><TrendingUp size={13} /> {item.sold} phần hôm nay</span></div>
                  <div className={styles.availability}><Badge tone={item.available ? "emerald" : "slate"} dot>{item.available ? "Đang mở bán" : "Tạm ngưng"}</Badge><button type="button" onClick={() => setNotice(`Đang mở thông tin món ${item.name}.`)}>Chi tiết</button></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "inventory" ? (
        <section className={`surface-card ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div><span className={styles.panelEyebrow}>Kiểm soát nguyên liệu</span><h2>Tồn kho hiện tại</h2><p>{lowStockCount} nguyên liệu đang dưới ngưỡng an toàn.</p></div>
            <button className="button-primary" type="button" disabled title="Cần nhập đủ số lượng, hạn dùng và giá vốn"><Plus size={16} /> Tạo phiếu nhập</button>
          </div>
          <div className={styles.stockCallout}>
            <span className={styles.warningIcon}><TriangleAlert size={19} /></span>
            <div><strong>{lowStockCount} nguyên liệu sắp hết</strong><p>Ưu tiên nhập bù trước ca chiều để không ảnh hưởng món đang mở bán.</p></div>
            <button type="button" onClick={() => setStockFilter("low")}>Xem nguyên liệu thấp <ArrowRight size={14} /></button>
          </div>
          <div className={styles.stockFilters}>
            {(["all", "low", "good"] as StockFilter[]).map((filter) => (
              <button className={stockFilter === filter ? styles.stockFilterActive : ""} type="button" key={filter} onClick={() => setStockFilter(filter)}>
                {filter === "all" ? "Tất cả" : filter === "low" ? "Sắp hết" : "Đủ hàng"}
                <span>{filter === "all" ? inventory.length : filter === "low" ? lowStockCount : inventory.length - lowStockCount}</span>
              </button>
            ))}
          </div>
          <div className={styles.inventoryTable}>
            <div className={`${styles.inventoryRow} ${styles.inventoryHead}`}><span>Nguyên liệu</span><span>Nhà cung cấp</span><span>Mức tồn</span><span>Cập nhật</span><span>Thao tác</span></div>
            {visibleInventory.map((item) => {
              const low = item.quantity <= item.minimum;
              const percent = Math.round((item.quantity / item.capacity) * 100);
              return (
                <article className={styles.inventoryRow} key={item.id}>
                  <div className={styles.inventoryIdentity}><span className={low ? styles.inventoryIconLow : styles.inventoryIcon}><Package size={18} /></span><span><strong>{item.name}</strong><small>Ngưỡng tối thiểu {item.minimum} {item.unit}</small></span></div>
                  <span className={styles.supplier} data-label="Nhà cung cấp">{item.supplier}</span>
                  <div className={styles.stockLevel} data-label="Mức tồn"><span><strong>{item.quantity} {item.unit}</strong><small>{percent}% sức chứa</small></span><div><i style={{ width: `${percent}%` }} className={low ? styles.progressLow : ""} /></div></div>
                  <span className={styles.stockUpdated} data-label="Cập nhật">{item.updatedAt}</span>
                  <div data-label="Thao tác">{low ? <button className={styles.restockButton} type="button" onClick={() => restock(item)}>Nhập bù</button> : <Badge tone="emerald" dot>Ổn định</Badge>}</div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === "analytics" ? (
        <section className={styles.analyticsSection}>
          <div className={styles.analyticsTop}>
            <article className={`surface-card ${styles.revenueCard}`}>
              <div className={styles.analyticsHeader}>
                <div><span className={styles.panelEyebrow}>Doanh thu</span><h2>Hiệu suất bán hàng</h2><p>Doanh thu đã thanh toán theo kỳ được chọn.</p></div>
                <div className={styles.rangeTabs}>{Object.keys(chartData).map((range) => <button className={analyticsRange === range ? styles.rangeActive : ""} type="button" key={range} onClick={() => setAnalyticsRange(range)}>{range}</button>)}</div>
              </div>
              <div className={styles.revenueSummary}><strong>{money.format(revenue)}</strong><span><TrendingUp size={14} /> Dữ liệu đã thanh toán</span></div>
              <div className={styles.chartWrap}>
                <div className={styles.yAxis}><span>4tr</span><span>3tr</span><span>2tr</span><span>1tr</span><span>0</span></div>
                <div className={styles.chart} style={{ gridTemplateColumns: `repeat(${chartData[analyticsRange].length}, minmax(0, 1fr))` }}>
                  {chartData[analyticsRange].map((point, index) => <div className={styles.barColumn} key={point.label}><div className={styles.barTrack}><i style={{ height: `${point.value}%` }} className={index === chartData[analyticsRange].length - 1 ? styles.barHighlight : ""}><span>{money.format(point.amount)}</span></i></div><small>{point.label}</small></div>)}
                </div>
              </div>
            </article>
            <aside className={`surface-card ${styles.performanceCard}`}>
              <div className={styles.gaugeIcon}><Gauge size={22} /></div><span className={styles.panelEyebrow}>Tỷ lệ hoàn tất</span><strong>{completionRate}%</strong><p>{completedCount} trên {apiOrders.length} đơn đã hoàn tất.</p><div className={styles.performanceTrack}><i style={{ width: `${completionRate}%` }} /></div><ul><li><span>Đơn đang xử lý</span><strong>{newCount + cookingCount}</strong></li><li><span>Giá trị đơn TB</span><strong>{money.format(averageOrder)}</strong></li><li><span>Đơn đã hủy</span><strong>{cancelledCount}</strong></li></ul>
            </aside>
          </div>
          <div className={styles.analyticsBottom}>
            <article className={`surface-card ${styles.topDishes}`}>
              <div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Top sản phẩm</span><h2>Món bán chạy</h2></div><Badge tone="red">Từ API</Badge></div>
              {topDishes.slice(0, 5).map((item, index) => <div className={styles.dishRank} key={item.menuItemId}><b>{index + 1}</b><span className={styles.rankIcon}><Soup size={17} /></span><div><strong>{item.name}</strong><small>{money.format(item.totalRevenue)}</small></div><span className={styles.rankSales}><strong>{item.salesCount}</strong><small>phần</small></span><div className={styles.rankBar}><i style={{ width: `${(item.salesCount / Math.max(topDishes[0]?.salesCount ?? 1, 1)) * 100}%` }} /></div></div>)}
            </article>
            <article className={`surface-card ${styles.shiftSummary}`}>
              <div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Theo khung giờ</span><h2>Nhịp phục vụ hôm nay</h2></div><CalendarDays size={19} /></div>
              <div className={styles.shiftTimeline}>
                {timeSlots.map((slot) => <div key={slot.start}><time>{String(slot.start).padStart(2, "0")}:00 – {String(slot.end).padStart(2, "0")}:00</time><span><i style={{ width: `${Math.round((slot.count / maxSlotCount) * 100)}%` }} /></span><strong>{slot.count} đơn</strong></div>)}
              </div>
              <div className={styles.peakNote}><Flame size={17} /><div><strong>Khung giờ cao điểm</strong><p>Dựa trên số đơn thực tế trong dữ liệu hiện tại.</p></div></div>
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}
