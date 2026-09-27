"use client";

import {
  ArchiveRestore,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Grid2X2,
  ListFilter,
  PencilLine,
  Plus,
  ReceiptText,
  Redo2,
  RefreshCw,
  Search,
  Soup,
  Table2,
  Tags,
  Trash2,
  Undo2,
  UsersRound,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  formatDateTime,
  type ApiCategory,
  type ApiListResponse,
  type ApiMenuCatalog,
  type ApiMenuItem,
  type ApiOrder,
  type ApiOrderPage,
  type ApiOrderStatus,
  type ApiTable,
  type ApiTableStatus,
} from "@/lib/api/domain";
import { gatewayApi } from "@/lib/api/gateway";
import { notifyNavigationMetricsChanged } from "@/lib/navigation-metrics";
import type { BadgeTone } from "@/lib/types";
import styles from "./can-tin.module.css";

type Tab = "orders" | "menu" | "categories" | "tables";
type Editor =
  | { kind: "menu"; id?: string; name: string; description: string; categoryId: string; price: string; imageUrl: string; isAvailable: boolean }
  | { kind: "category"; id?: string; name: string; description: string; displayOrder: string; isActive: boolean }
  | { kind: "table"; id?: string; name: string; capacity: string };

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const statusMeta: Record<ApiOrderStatus, { label: string; tone: BadgeTone }> = {
  CREATED: { label: "Chờ thanh toán", tone: "amber" },
  COMPLETED: { label: "Đã hoàn tất", tone: "emerald" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
};
const tableStatusMeta: Record<ApiTableStatus, { label: string; tone: BadgeTone }> = {
  empty: { label: "Đang trống", tone: "emerald" },
  occupied: { label: "Đang sử dụng", tone: "red" },
  reserved: { label: "Đã đặt trước", tone: "amber" },
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function CanteenAdminPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [menu, setMenu] = useState<ApiMenuItem[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [tables, setTables] = useState<ApiTable[]>([]);
  const [query, setQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState<"all" | ApiOrderStatus>("all");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }, []);

  const loadCanteen = useCallback(async () => {
    setLoading(true);
    setError("");
    const [ordersResult, menuResult, categoriesResult, tablesResult] = await Promise.allSettled([
      gatewayApi<ApiOrderPage>("canteen/orders?limit=100"),
      gatewayApi<ApiMenuCatalog>("canteen/admin/menu"),
      gatewayApi<ApiListResponse<ApiCategory>>("canteen/categories?limit=100&sortBy=displayOrder&sortOrder=asc"),
      gatewayApi<ApiListResponse<ApiTable>>("canteen/tables?limit=100&sortBy=name&sortOrder=asc"),
    ]);

    if (ordersResult.status === "fulfilled") setOrders(Array.isArray(ordersResult.value.orders) ? ordersResult.value.orders : []);
    if (menuResult.status === "fulfilled") {
      setMenu(Array.isArray(menuResult.value.items) ? menuResult.value.items : []);
      setCategories(Array.isArray(menuResult.value.categories) ? menuResult.value.categories : []);
    } else if (categoriesResult.status === "fulfilled") {
      setCategories(Array.isArray(categoriesResult.value.data) ? categoriesResult.value.data : []);
    }
    if (tablesResult.status === "fulfilled") setTables(Array.isArray(tablesResult.value.data) ? tablesResult.value.data : []);

    const failed = [ordersResult, menuResult, categoriesResult, tablesResult].filter((result) => result.status === "rejected");
    if (failed.length) {
      const first = failed[0] as PromiseRejectedResult;
      setError(`${failed.length}/4 nhóm dữ liệu chưa tải được. ${errorMessage(first.reason, "Vui lòng thử lại.")}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void Promise.resolve().then(loadCanteen); }, [loadCanteen]);

  useEffect(() => {
    if (!editor) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setEditor(null); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", close); };
  }, [editor]);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category._id, category])), [categories]);
  const tableById = useMemo(() => new Map(tables.map((table) => [table._id, table])), [tables]);
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = orderStatus === "all" || order.status === orderStatus;
    const haystack = `${order.orderNumber} ${order.userId} ${order.items.map((item) => item.name).join(" ")}`.toLocaleLowerCase("vi");
    return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
  });
  const filteredMenu = menu.filter((item) => !normalizedQuery || `${item.name} ${item.description ?? ""} ${categoryById.get(item.categoryId)?.name ?? ""}`.toLocaleLowerCase("vi").includes(normalizedQuery));
  const filteredCategories = categories.filter((item) => !normalizedQuery || `${item.name} ${item.description ?? ""}`.toLocaleLowerCase("vi").includes(normalizedQuery));
  const filteredTables = tables.filter((item) => !normalizedQuery || item.name.toLocaleLowerCase("vi").includes(normalizedQuery));

  const mutate = async (key: string, action: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(key);
    try {
      await action();
      await loadCanteen();
      notifyNavigationMetricsChanged();
      showNotice(success);
    } catch (mutationError) {
      showNotice(errorMessage(mutationError, "Không thể hoàn tất thao tác."));
    } finally { setBusy(""); }
  };

  const settleOrder = (order: ApiOrder) => void mutate(
    `order-${order._id}`,
    () => gatewayApi(`canteen/orders/${encodeURIComponent(order._id)}/payment/cash`, { method: "PATCH" }),
    `Đã xác nhận thu tiền và hoàn tất ${order.orderNumber}.`,
  );

  const cancelOrder = (order: ApiOrder) => {
    const reason = window.prompt(`Lý do hủy ${order.orderNumber}:`);
    if (!reason?.trim()) return;
    void mutate(
      `order-${order._id}`,
      () => gatewayApi(`canteen/orders/${encodeURIComponent(order._id)}/cancel`, { method: "PATCH", json: { reason: reason.trim() } }),
      `Đã hủy ${order.orderNumber}.`,
    );
  };

  const toggleMenu = (item: ApiMenuItem) => void mutate(
    `menu-${item._id}`,
    () => gatewayApi(`canteen/admin/menu/${encodeURIComponent(item._id)}`, { method: "PUT", json: { isAvailable: !item.isAvailable } }),
    item.isAvailable ? `Đã tạm ẩn ${item.name}.` : `Đã mở bán ${item.name}.`,
  );

  const removeMenu = (item: ApiMenuItem) => {
    if (!window.confirm(`Xóa món “${item.name}”? Bạn có thể dùng Hoàn tác ngay sau đó.`)) return;
    void mutate(`menu-${item._id}`, () => gatewayApi(`canteen/admin/menu/${encodeURIComponent(item._id)}`, { method: "DELETE" }), `Đã xóa ${item.name}.`);
  };

  const openMenuEditor = (item?: ApiMenuItem) => setEditor({
    kind: "menu",
    ...(item ? { id: item._id } : {}),
    name: item?.name ?? "",
    description: item?.description ?? "",
    categoryId: item?.categoryId ?? categories[0]?._id ?? "",
    price: item ? String(item.price) : "",
    imageUrl: item?.imageUrl ?? "",
    isAvailable: item?.isAvailable ?? true,
  });

  const openCategoryEditor = (category?: ApiCategory) => setEditor({
    kind: "category",
    ...(category ? { id: category._id } : {}),
    name: category?.name ?? "",
    description: category?.description ?? "",
    displayOrder: String(category?.displayOrder ?? categories.length + 1),
    isActive: category?.isActive ?? true,
  });

  const openTableEditor = (table?: ApiTable) => setEditor({
    kind: "table",
    ...(table ? { id: table._id } : {}),
    name: table?.name ?? "",
    capacity: String(table?.capacity ?? 4),
  });

  const saveEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || busy) return;
    const key = `editor-${editor.kind}`;
    setBusy(key);
    try {
      if (editor.kind === "menu") {
        const price = Number(editor.price);
        if (!editor.name.trim() || !editor.categoryId || !Number.isSafeInteger(price) || price < 0) throw new Error("Tên món, danh mục và giá nguyên không âm là bắt buộc.");
        const body = { categoryId: editor.categoryId, name: editor.name.trim(), description: editor.description.trim() || undefined, price, imageUrl: editor.imageUrl.trim() || undefined, isAvailable: editor.isAvailable };
        await gatewayApi(editor.id ? `canteen/admin/menu/${encodeURIComponent(editor.id)}` : "canteen/admin/menu", { method: editor.id ? "PUT" : "POST", json: body });
      } else if (editor.kind === "category") {
        const displayOrder = Number(editor.displayOrder);
        if (!editor.name.trim() || !editor.description.trim() || !Number.isInteger(displayOrder) || displayOrder < 0) throw new Error("Tên, mô tả và thứ tự hiển thị hợp lệ là bắt buộc.");
        const body = { name: editor.name.trim(), description: editor.description.trim(), displayOrder, isActive: editor.isActive };
        await gatewayApi(editor.id ? `canteen/categories/${encodeURIComponent(editor.id)}` : "canteen/categories", { method: editor.id ? "PATCH" : "POST", json: body });
      } else {
        const capacity = Number(editor.capacity);
        if (!editor.name.trim() || !Number.isInteger(capacity) || capacity < 1) throw new Error("Tên bàn và sức chứa từ 1 người là bắt buộc.");
        await gatewayApi(editor.id ? `canteen/tables/${encodeURIComponent(editor.id)}` : "canteen/tables", { method: editor.id ? "PATCH" : "POST", json: { name: editor.name.trim(), capacity } });
      }
      const editing = Boolean(editor.id);
      const label = editor.kind === "menu" ? "món ăn" : editor.kind === "category" ? "danh mục" : "bàn ăn";
      setEditor(null);
      await loadCanteen();
      showNotice(`Đã ${editing ? "cập nhật" : "tạo"} ${label}.`);
    } catch (saveError) {
      showNotice(errorMessage(saveError, "Không thể lưu dữ liệu."));
    } finally { setBusy(""); }
  };

  const removeCategory = (category: ApiCategory) => {
    if (!window.confirm(`Xóa danh mục “${category.name}”? Backend sẽ từ chối nếu danh mục còn món ăn.`)) return;
    void mutate(`category-${category._id}`, () => gatewayApi(`canteen/categories/${encodeURIComponent(category._id)}`, { method: "DELETE" }), `Đã xóa danh mục ${category.name}.`);
  };

  const changeTableStatus = (table: ApiTable, status: ApiTableStatus) => void mutate(
    `table-${table._id}`,
    () => gatewayApi(`canteen/tables/${encodeURIComponent(table._id)}/status`, { method: "PATCH", json: { status } }),
    `Đã cập nhật trạng thái ${table.name}.`,
  );

  const removeTable = (table: ApiTable) => {
    if (!window.confirm(`Xóa ${table.name}? Chỉ bàn đang trống mới có thể xóa.`)) return;
    void mutate(`table-${table._id}`, () => gatewayApi(`canteen/tables/${encodeURIComponent(table._id)}`, { method: "DELETE" }), `Đã xóa ${table.name}.`);
  };

  const pendingOrders = orders.filter((order) => order.status === "CREATED").length;
  const completedOrders = orders.filter((order) => order.status === "COMPLETED").length;
  const revenue = orders.filter((order) => order.paymentStatus === "PAID").reduce((sum, order) => sum + order.finalAmount, 0);
  const occupiedTables = tables.filter((table) => table.status !== "empty").length;

  const tabs: Array<{ value: Tab; label: string; count: number; icon: typeof ReceiptText }> = [
    { value: "orders", label: "Đơn hàng", count: orders.length, icon: ReceiptText },
    { value: "menu", label: "Thực đơn", count: menu.length, icon: Soup },
    { value: "categories", label: "Danh mục", count: categories.length, icon: Tags },
    { value: "tables", label: "Bàn ăn", count: tables.length, icon: Table2 },
  ];

  return (
    <div className={styles.page}>
      {notice ? <div className={styles.toast} role="status"><CheckCircle2 size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><X size={14} /></button></div> : null}
      <PageHeader
        eyebrow="Căn tin / Vận hành"
        title="Quản lý căn tin"
        description="Theo dõi đơn tiền mặt, thực đơn, danh mục và bàn ăn đúng theo dữ liệu backend hiện có."
        actions={<button className="button-secondary" type="button" onClick={() => void loadCanteen()} disabled={loading}><RefreshCw size={16} /> {loading ? "Đang đồng bộ" : "Làm mới"}</button>}
      />

      {error ? <div className={styles.errorBanner} role="alert"><Ban size={17} /><span>{error}</span><button type="button" onClick={() => void loadCanteen()}>Thử lại</button></div> : null}

      <section className={styles.statsGrid} aria-label="Tổng quan căn tin">
        <StatCard label="Đơn chờ xử lý" value={pendingOrders} helper="cần thu tiền hoặc hủy" icon={<ReceiptText size={18} />} tone="amber" />
        <StatCard label="Đơn hoàn tất" value={completedOrders} helper="trong dữ liệu đang tải" icon={<CheckCircle2 size={18} />} tone="emerald" />
        <StatCard label="Doanh thu đã thu" value={money.format(revenue)} helper="chỉ tính đơn PAID" icon={<CircleDollarSign size={18} />} tone="blue" />
        <StatCard label="Bàn đang dùng" value={`${occupiedTables}/${tables.length}`} helper="đang dùng hoặc đặt trước" icon={<Table2 size={18} />} tone="violet" />
      </section>

      <section className={styles.workspace}>
        <nav className={styles.tabs} aria-label="Nghiệp vụ căn tin">
          {tabs.map((item) => {
            const Icon = item.icon;
            return <button type="button" className={tab === item.value ? styles.tabActive : ""} onClick={() => { setTab(item.value); setQuery(""); }} key={item.value}><Icon size={17} /><span>{item.label}</span><b>{item.count}</b></button>;
          })}
        </nav>

        <div className={styles.toolbar}>
          <label className={styles.search}><Search size={17} /><span className="sr-only">Tìm kiếm</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "orders" ? "Tìm mã đơn, người đặt hoặc món..." : `Tìm trong ${tabs.find((item) => item.value === tab)?.label.toLowerCase()}...`} />{query ? <button type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={14} /></button> : null}</label>
          {tab === "orders" ? <label className={styles.select}><ListFilter size={15} /><select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value as "all" | ApiOrderStatus)}><option value="all">Mọi trạng thái</option>{Object.entries(statusMeta).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select></label> : null}
          {tab === "menu" ? <div className={styles.toolbarActions}><button type="button" onClick={() => void mutate("undo", () => gatewayApi("canteen/admin/menu/undo", { method: "POST" }), "Đã hoàn tác thay đổi gần nhất.")}><Undo2 size={15} /> Hoàn tác</button><button type="button" onClick={() => void mutate("redo", () => gatewayApi("canteen/admin/menu/redo", { method: "POST" }), "Đã làm lại thay đổi gần nhất.")}><Redo2 size={15} /> Làm lại</button><button className={styles.primaryAction} type="button" onClick={() => openMenuEditor()} disabled={!categories.length}><Plus size={15} /> Thêm món</button></div> : null}
          {tab === "categories" ? <button className={styles.primaryAction} type="button" onClick={() => openCategoryEditor()}><Plus size={15} /> Thêm danh mục</button> : null}
          {tab === "tables" ? <button className={styles.primaryAction} type="button" onClick={() => openTableEditor()}><Plus size={15} /> Thêm bàn</button> : null}
        </div>

        {tab === "orders" ? (
          <div className={styles.orderList}>
            <div className={styles.orderHead}><span>Đơn hàng</span><span>Bàn / người đặt</span><span>Món</span><span>Thanh toán</span><span>Trạng thái</span><span>Thao tác</span></div>
            {filteredOrders.map((order) => {
              const meta = statusMeta[order.status];
              return <article className={styles.orderRow} key={order._id}>
                <div className={styles.orderIdentity}><span><ReceiptText size={18} /></span><div><strong>{order.orderNumber}</strong><small>{formatDateTime(order.createdAt)}</small></div></div>
                <div className={styles.stack}><strong>{tableById.get(order.tableId ?? "")?.name ?? (order.tableId ? `Bàn ${order.tableId.slice(-6)}` : "Chưa có bàn")}</strong><small>{order.userId}</small></div>
                <div className={styles.items}>{order.items.map((item) => <span key={`${item.menuItemId ?? item.name}-${item.name}`}>{item.name} × {item.quantity}</span>)}</div>
                <div className={styles.stack}><strong>{money.format(order.finalAmount)}</strong><small>{order.paymentStatus === "PAID" ? "Đã thu tiền mặt" : "Chưa thanh toán"}</small></div>
                <Badge tone={meta.tone} dot>{meta.label}</Badge>
                <div className={styles.rowActions}>{order.status === "CREATED" ? <><button className={styles.payButton} type="button" onClick={() => settleOrder(order)} disabled={busy === `order-${order._id}`}><CircleDollarSign size={14} /> Đã thu tiền</button><button className={styles.iconButton} type="button" onClick={() => cancelOrder(order)} aria-label={`Hủy ${order.orderNumber}`} disabled={busy === `order-${order._id}`}><X size={15} /></button></> : <span className={styles.doneText}>Không còn thao tác</span>}</div>
              </article>;
            })}
            {!filteredOrders.length ? <Empty icon={<ReceiptText size={25} />} title="Không có đơn phù hợp" description="Thay đổi bộ lọc hoặc chờ đơn mới từ ứng dụng người dùng." /> : null}
          </div>
        ) : null}

        {tab === "menu" ? (
          <div className={styles.cardGrid}>
            {filteredMenu.map((item) => <article className={`${styles.entityCard} ${!item.isAvailable ? styles.entityMuted : ""}`} key={item._id}>
              <div className={styles.entityTop}><span className={styles.entityIcon}><Soup size={22} /></span><Badge tone={item.isAvailable ? "emerald" : "slate"} dot>{item.isAvailable ? "Đang bán" : "Đang ẩn"}</Badge></div>
              <div className={styles.entityBody}><small>{categoryById.get(item.categoryId)?.name ?? "Danh mục không còn tồn tại"}</small><h3>{item.name}</h3><p>{item.description?.trim() || "Chưa có mô tả món ăn."}</p><strong>{money.format(item.price)}</strong></div>
              <footer className={styles.entityActions}><button type="button" onClick={() => toggleMenu(item)} disabled={busy === `menu-${item._id}`}>{item.isAvailable ? "Tạm ẩn" : "Mở bán"}</button><button type="button" onClick={() => openMenuEditor(item)} aria-label={`Sửa ${item.name}`}><PencilLine size={15} /></button><button className={styles.dangerButton} type="button" onClick={() => removeMenu(item)} aria-label={`Xóa ${item.name}`}><Trash2 size={15} /></button></footer>
            </article>)}
            {!filteredMenu.length ? <Empty icon={<Soup size={25} />} title="Chưa có món ăn" description={categories.length ? "Tạo món mới để bắt đầu xây dựng thực đơn." : "Bạn cần tạo danh mục trước khi thêm món."} /> : null}
          </div>
        ) : null}

        {tab === "categories" ? (
          <div className={styles.cardGrid}>
            {filteredCategories.map((category) => <article className={styles.entityCard} key={category._id}>
              <div className={styles.entityTop}><span className={styles.entityIcon}><Tags size={22} /></span><Badge tone={category.isActive !== false ? "emerald" : "slate"} dot>{category.isActive !== false ? "Đang hiển thị" : "Đang ẩn"}</Badge></div>
              <div className={styles.entityBody}><small>Thứ tự {category.displayOrder ?? 0}</small><h3>{category.name}</h3><p>{category.description || "Chưa có mô tả."}</p><strong>{menu.filter((item) => item.categoryId === category._id).length} món</strong></div>
              <footer className={styles.entityActions}><button type="button" onClick={() => void mutate(`category-${category._id}`, () => gatewayApi(`canteen/categories/${encodeURIComponent(category._id)}`, { method: "PATCH", json: { isActive: category.isActive === false } }), category.isActive === false ? "Đã hiển thị danh mục." : "Đã ẩn danh mục.")}>{category.isActive === false ? "Hiển thị" : "Tạm ẩn"}</button><button type="button" onClick={() => openCategoryEditor(category)} aria-label={`Sửa ${category.name}`}><PencilLine size={15} /></button><button className={styles.dangerButton} type="button" onClick={() => removeCategory(category)} aria-label={`Xóa ${category.name}`}><Trash2 size={15} /></button></footer>
            </article>)}
            {!filteredCategories.length ? <Empty icon={<Tags size={25} />} title="Chưa có danh mục" description="Tạo danh mục để phân nhóm thực đơn." /> : null}
          </div>
        ) : null}

        {tab === "tables" ? (
          <div className={styles.tableGrid}>
            {filteredTables.map((table) => <article className={styles.tableCard} key={table._id}>
              <div className={styles.tableVisual}><Table2 size={24} /><span>{table.capacity}</span></div>
              <div className={styles.tableCopy}><small>Bàn phục vụ</small><h3>{table.name}</h3><p><UsersRound size={14} /> Tối đa {table.capacity} người</p><Badge tone={tableStatusMeta[table.status].tone} dot>{tableStatusMeta[table.status].label}</Badge></div>
              <label className={styles.statusSelect}><span className="sr-only">Trạng thái {table.name}</span><select value={table.status} onChange={(event) => changeTableStatus(table, event.target.value as ApiTableStatus)} disabled={busy === `table-${table._id}`}><option value="empty">Đang trống</option><option value="occupied">Đang sử dụng</option><option value="reserved">Đã đặt trước</option></select></label>
              <div className={styles.tableActions}><button type="button" onClick={() => openTableEditor(table)}><PencilLine size={15} /></button><button type="button" className={styles.dangerButton} onClick={() => removeTable(table)} disabled={table.status !== "empty"}><Trash2 size={15} /></button></div>
            </article>)}
            {!filteredTables.length ? <Empty icon={<Grid2X2 size={25} />} title="Chưa có bàn ăn" description="Tạo bàn để người dùng có thể đặt món đúng vị trí." /> : null}
          </div>
        ) : null}
      </section>

      {editor ? <div className="modal-backdrop" onMouseDown={() => setEditor(null)}><section className={`modal-card ${styles.modal}`} role="dialog" aria-modal="true" aria-labelledby="canteen-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}><div><span>{editor.kind === "menu" ? <Soup size={19} /> : editor.kind === "category" ? <Tags size={19} /> : <Table2 size={19} />}</span><div><small>{editor.id ? "Chỉnh sửa dữ liệu" : "Tạo dữ liệu mới"}</small><h2 id="canteen-editor-title">{editor.kind === "menu" ? "Thông tin món ăn" : editor.kind === "category" ? "Thông tin danh mục" : "Thông tin bàn ăn"}</h2></div></div><button type="button" onClick={() => setEditor(null)} aria-label="Đóng"><X size={18} /></button></header>
        <form onSubmit={(event) => void saveEditor(event)}>
          <div className={styles.modalBody}>
            <label><span className="form-label">Tên <em>*</em></span><input className="field" autoFocus value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} required /></label>
            {editor.kind === "menu" ? <>
              <label><span className="form-label">Danh mục <em>*</em></span><select className="select-field" value={editor.categoryId} onChange={(event) => setEditor({ ...editor, categoryId: event.target.value })} required><option value="">Chọn danh mục</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
              <label><span className="form-label">Giá bán (VND) <em>*</em></span><input className="field" type="number" min="0" step="1" value={editor.price} onChange={(event) => setEditor({ ...editor, price: event.target.value })} required /></label>
              <label><span className="form-label">URL hình ảnh</span><input className="field" type="url" value={editor.imageUrl} onChange={(event) => setEditor({ ...editor, imageUrl: event.target.value })} placeholder="https://..." /></label>
              <label className={styles.fullField}><span className="form-label">Mô tả</span><textarea className="textarea-field" value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} /></label>
              <label className={styles.checkField}><input type="checkbox" checked={editor.isAvailable} onChange={(event) => setEditor({ ...editor, isAvailable: event.target.checked })} /><span>Cho phép hiển thị và đặt món</span></label>
            </> : null}
            {editor.kind === "category" ? <>
              <label><span className="form-label">Thứ tự hiển thị</span><input className="field" type="number" min="0" step="1" value={editor.displayOrder} onChange={(event) => setEditor({ ...editor, displayOrder: event.target.value })} required /></label>
              <label className={styles.fullField}><span className="form-label">Mô tả <em>*</em></span><textarea className="textarea-field" value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} required /></label>
              <label className={styles.checkField}><input type="checkbox" checked={editor.isActive} onChange={(event) => setEditor({ ...editor, isActive: event.target.checked })} /><span>Hiển thị danh mục trên thực đơn</span></label>
            </> : null}
            {editor.kind === "table" ? <label><span className="form-label">Sức chứa <em>*</em></span><input className="field" type="number" min="1" step="1" value={editor.capacity} onChange={(event) => setEditor({ ...editor, capacity: event.target.value })} required /></label> : null}
          </div>
          <footer className={styles.modalFooter}><button className="button-secondary" type="button" onClick={() => setEditor(null)}>Hủy</button><button className="button-primary" type="submit" disabled={busy === `editor-${editor.kind}`}><ArchiveRestore size={15} /> {busy === `editor-${editor.kind}` ? "Đang lưu..." : "Lưu thay đổi"}</button></footer>
        </form>
      </section></div> : null}
    </div>
  );
}

function Empty({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className={styles.empty}><span>{icon}</span><strong>{title}</strong><p>{description}</p></div>;
}
