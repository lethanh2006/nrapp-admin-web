export default function Loading() {
  return (
    <div style={{ display: "grid", minHeight: 420, placeItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: 12, color: "var(--slate-400)", fontSize: 11, fontWeight: 800 }}>
        <span style={{ width: 34, height: 34, border: "3px solid var(--red-100)", borderTopColor: "var(--red-600)", borderRadius: "50%", animation: "loading-spin .75s linear infinite" }} />
        Đang tải không gian quản trị...
      </div>
    </div>
  );
}
