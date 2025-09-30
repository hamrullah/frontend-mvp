import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_BASE = "https://backend-mvp-nine.vercel.app/api";

const STATUS_LABEL = { 1: "Completed", 0: "Pending", 2: "Cancelled", 3: "Refunded", 4: "Paid" };
const STATUS_TAG = { Completed: "is-success", Pending: "is-warning", Cancelled: "is-danger", Refunded: "is-light", Paid: "is-primary" };

export default function OrdersPage() {
  // ====== main state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  // toolbar & filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pmFilter, setPmFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ====== detail modal
  const [openDetail, setOpenDetail] = useState(false);
  const [detailHeader, setDetailHeader] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const detailRef = useRef(null);

  // ====== create order modal
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Member dropdown
  const [memberId, setMemberId] = useState("");
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersErr, setMembersErr] = useState("");

  // Vendor dropdown (optional voucher filter)
  const [vendorPick, setVendorPick] = useState("");
  const [vendorsCreate, setVendorsCreate] = useState([]);
  const [vendorsCreateLoading, setVendorsCreateLoading] = useState(false);
  const [vendorsCreateErr, setVendorsCreateErr] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");

  // Items
  const [createItems, setCreateItems] = useState([{ id: 1, voucher_id: "", qty: 1, price: "" }]);

  // Voucher list per row
  const [voucherLists, setVoucherLists] = useState({});

  const token = (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  // ===== Helpers
  const toRinggit = (n) =>
    new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(n || 0));
  const fmtDateTime = (s) => (s ? new Date(s).toLocaleString("en-MY") : "—");
  const statusBadge = (statusInt) => {
    const label = STATUS_LABEL[statusInt] || "Pending";
    const tag = STATUS_TAG[label] || "is-light";
    return <span className={`tag ${tag} is-light`}>{label}</span>;
  };
  const updateCreateRow = (id, field, value) =>
    setCreateItems((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: field === "qty" ? Number(value) : value } : x)));
  const updateVoucherListState = (rowId, patch) =>
    setVoucherLists((prev) => ({ ...prev, [rowId]: { options: [], loading: false, err: "", search: "", ...(prev[rowId] || {}), ...patch } }));

  // ===== Orders list
  const fetchOrders = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = { page, pageSize };
      if (statusFilter) params.status = statusFilter;
      if (pmFilter) params.payment = pmFilter;
      if (vendorFilter) params.vendorId = vendorFilter;
      if (from) params.from = from;
      if (to) params.to = to;
      if (query) params.q = query;

      const { data } = await axios.get(`${API_BASE}/orders`, { params, headers: authHeaders });
      setRows(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.total || 0));
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || "Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // toolbar derived
  const paymentOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.payment_methode).filter(Boolean))), [rows]);
  const vendorOptions = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => r.details?.forEach((d) => d.voucher?.vendor_id && s.add(String(d.voucher.vendor_id))));
    return Array.from(s);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((o) => {
      const base = [
        o.code_trx,
        o.member?.name_member,
        o.payment_methode,
        o.totalAmount,
        o.status,
        o.created_at,
        ...(Array.isArray(o.details) ? o.details.map((d) => d?.voucher?.title || "").flat() : []),
      ]
        .map((v) => (v == null ? "" : String(v)))
        .join(" ")
        .toLowerCase();
      return base.includes(q);
    });
  }, [rows, query]);
  const totals = useMemo(
    () => filtered.reduce((acc, r) => ({ omzet: acc.omzet + Number(r.totalAmount || 0), count: acc.count + 1 }), { omzet: 0, count: 0 }),
    [filtered]
  );

  // ===== Detail modal
  const openDetailModal = (row) => {
    setOpenDetail(true);
    setDetailHeader({
      id: row.code_trx,
      createdAt: row.created_at || row.date_order,
      totalAmount: row.totalAmount,
      paymentStatus: STATUS_LABEL[row.status] || "Pending",
      gateway: row.payment_methode || "-",
      txnId: "-",
      customerName: row.member?.name_member || "-",
    });
    const items = Array.isArray(row.details) ? row.details : [];
    setDetailItems(
      items.map((it) => ({
        detail_id: it.id,
        code_item: it.voucher?.code_voucher || it.voucher_id,
        item_name: it.voucher?.title || "Voucher",
        vendor: it.voucher?.vendor_id || "-",
        qty: Number(it.qty || 0),
        price: Number(it.price || 0),
      }))
    );
  };

  // ===== Member/Vendor dropdown
  const loadMembers = async (q = "") => {
    setMembersLoading(true);
    setMembersErr("");
    try {
      const { data } = await axios.get(`${API_BASE}/member/list-member`, {
        params: { limit: 50, offset: 0, q, status: 1, sortBy: "name", sortDir: "asc" },
        headers: authHeaders,
      });
      setMembers(Array.isArray(data?.members) ? data.members : []);
    } catch (e) {
      console.error(e);
      setMembersErr(e?.response?.data?.error || "Failed to load members.");
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };
  const loadVendorsCreate = async (q = "") => {
    setVendorsCreateLoading(true);
    setVendorsCreateErr("");
    try {
      const { data } = await axios.get(`${API_BASE}/vendor/list-vendor`, {
        params: { limit: 50, offset: 0, q, status: 1, sortBy: "name", sortDir: "asc" },
        headers: authHeaders,
      });
      setVendorsCreate(Array.isArray(data?.vendors) ? data.vendors : []);
    } catch (e) {
      console.error(e);
      setVendorsCreateErr(e?.response?.data?.error || "Failed to load vendors.");
      setVendorsCreate([]);
    } finally {
      setVendorsCreateLoading(false);
    }
  };

  // ===== Voucher dropdown per row
  const loadVouchersForRow = async (rowId, search = "") => {
    try {
      updateVoucherListState(rowId, { loading: true, err: "" });
      const params = { limit: 50, offset: 0 };
      if (search) params.q = search;
      if (vendorPick) params.vendor_id = vendorPick; // filter by vendor if selected
      const { data } = await axios.get(`${API_BASE}/voucher/list-voucher`, { params, headers: authHeaders });
      const rows = Array.isArray(data?.vouchers) ? data.vouchers : Array.isArray(data?.data) ? data.data : [];
      updateVoucherListState(rowId, { options: rows, loading: false });
    } catch (e) {
      console.error(e);
      updateVoucherListState(rowId, { loading: false, err: e?.response?.data?.error || "Failed to load vouchers." });
    }
  };

  // Open create
  const openCreateModal = () => {
    setMemberId("");
    setPaymentMethod("Bank Transfer");
    setCreateItems([{ id: 1, voucher_id: "", qty: 1, price: "" }]);
    setVoucherLists({});
    setVendorPick("");
    setErr("");
    setSuccess("");
    setOpenCreate(true);
  };

  useEffect(() => { if (openCreate) { loadMembers(""); loadVendorsCreate(""); } }, [openCreate]);

  // load vouchers for each row when modal open / vendorPick changed / row count changed
  useEffect(() => {
    if (!openCreate) return;
    const timers = createItems.map((row) =>
      setTimeout(() => {
        const s = voucherLists[row.id]?.search || "";
        loadVouchersForRow(row.id, s.trim());
      }, 200)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreate, vendorPick, createItems.length]);

  // Items helpers
  const addCreateRow = () => {
    setCreateItems((prev) => {
      const id = prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1;
      setTimeout(() => updateVoucherListState(id, { options: [], loading: false, err: "", search: "" }), 0);
      return [...prev, { id, voucher_id: "", qty: 1, price: "" }];
    });
  };
  const removeCreateRow = (id) => {
    setCreateItems((prev) => prev.filter((x) => x.id !== id));
    setVoucherLists((prev) => {
      const c = { ...prev };
      delete c[id];
      return c;
    });
  };
  const createSubtotal = (row) => Number(row.qty || 0) * Number(row.price || 0);
  const createTotal = useMemo(() => createItems.reduce((a, r) => a + createSubtotal(r), 0), [createItems]);

  const validateCreate = () => {
    if (!memberId) return "member_id is required";
    if (!createItems.length) return "At least 1 item is required";
    for (let i = 0; i < createItems.length; i++) {
      const it = createItems[i];
      if (!it.voucher_id) return `Voucher in row ${i + 1} must be selected`;
      if (!Number.isInteger(Number(it.qty)) || Number(it.qty) <= 0) return `Quantity in row ${i + 1} is invalid`;
      if (!Number.isFinite(Number(it.price)) || Number(it.price) < 0) return `Price in row ${i + 1} is invalid`;
    }
    return "";
  };

  const submitCreate = async () => {
    const v = validateCreate();
    if (v) { setErr(v); return; }
    setSaving(true); setErr(""); setSuccess("");
    try {
      const payload = {
        member_id: Number(memberId),
        payment_methode: paymentMethod,
        items: createItems.map((it) => ({ voucher_id: Number(it.voucher_id), qty: Number(it.qty), price: Number(it.price) })),
      };
      const { data } = await axios.post(`${API_BASE}/orders/add-order`, payload, { headers: authHeaders });
      setOpenCreate(false);
      setSuccess(`Order ${data?.data?.code_trx || ""} has been created.`);
      fetchOrders();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || "Failed to create order.");
    } finally { setSaving(false); }
  };

  // ===== export & toolbar
  const csvEscape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const downloadCSV = (filename, rowsArr, columns) => {
    const header = columns.map((c) => csvEscape(c.label)).join(",");
    const lines = rowsArr.map((r) => columns.map((c) => csvEscape(typeof c.value === "function" ? c.value(r) : r[c.key])).join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const exportOrdersCSV = () => {
    if (!filtered.length) return;
    const cols = [
      { label: "Order Code", key: "code_trx" },
      { label: "Customer", value: (r) => r.member?.name_member || "-" },
      { label: "Item Counts", value: (r) => (Array.isArray(r.details) ? r.details.length : 0) },
      { label: "Total Amount", key: "totalAmount" },
      { label: "Status", value: (r) => STATUS_LABEL[r.status] || "Pending" },
      { label: "Payment Method", key: "payment_methode" },
      { label: "Created at", value: (r) => fmtDateTime(r.created_at || r.date_order) },
    ];
    downloadCSV(`orders_${Date.now()}.csv`, filtered, cols);
  };
  const applyFilters = () => { setPage(1); fetchOrders(); };
  const clearFilters = () => { setStatusFilter(""); setPmFilter(""); setVendorFilter(""); setFrom(""); setTo(""); setQuery(""); setPage(1); fetchOrders(); };

  // ===== Print detail
  const printDetail = () => {
    if (!detailRef.current) return;
    const win = window.open("", "PRINT", "width=900,height=650"); if (!win) return;
    const html = `
      <html>
        <head>
          <title>Order Details</title>
          <style>body{font-family:Arial,sans-serif}th,td{border:1px solid #ddd;padding:8px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5}</style>
        </head>
        <body>${detailRef.current.innerHTML}<script>window.print()</script></body>
      </html>`;
    win.document.open(); win.document.write(html); win.document.close();
  };

  // ===== UI
  return (
    <section className="section vendor-page">
      {/* inject styles so layout match the design */}
      <style>{pageCss}</style>

      <div className="container is-fluid">
        <div className="card soft-card vp-shell">
          <div className="card-content">
            <h1 className="title is-5 mb-4">Orders</h1>

            {/* Toolbar */}
            <div className="toolbar mt-1 mb-4">
              <div className="toolbar-row">
                <div className="pill">
                  <div className="select is-rounded select-pill">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="">All Status</option>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pill">
                  <div className="select is-rounded select-pill">
                    <select value={pmFilter} onChange={(e) => setPmFilter(e.target.value)}>
                      <option value="">Payment Method</option>
                      {paymentOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pill">
                  <div className="select is-rounded select-pill">
                    <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
                      <option value="">Vendor</option>
                      {vendorOptions.map((v) => <option key={v} value={v}>Vendor {v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pill">
                  <div className="date-wrap">
                    <input type="date" className="input is-rounded input-date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    <span style={{ margin: "0 8px" }}>—</span>
                    <input type="date" className="input is-rounded input-date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                </div>
                <div className="pill pill-search is-flex-grow-1">
                  <div className="control has-icons-left">
                    <input
                      className="input is-rounded"
                      placeholder="Order code / buyer / vendor"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <span className="icon is-left">🔎</span>
                  </div>
                </div>
                <div className="pill">
                  <button className="button" onClick={applyFilters}>Apply</button>
                </div>
                <div className="pill">
                  <button className="button is-light" onClick={clearFilters}>Reset</button>
                </div>
                <div className="pill">
                  <button className="button is-link" onClick={exportOrdersCSV} disabled={!filtered.length}>Export</button>
                </div>
                <div className="pill">
                  <button className="button is-danger" onClick={openCreateModal}>+ Create Order</button>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {err && <div className="notification is-danger is-light">{err}</div>}
            {success && <div className="notification is-success is-light">{success}</div>}
            {loading && <progress className="progress is-small is-primary" max="100">Loading…</progress>}

            {/* Orders Table */}
            <div className="table-wrap">
              <div className="table-container">
                <table className="table is-fullwidth is-hoverable affiliate-table">
                  <thead>
                    <tr>
                      <th style={{ width: 64 }}>No</th>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Vendor Name</th>
                      <th>Item Counts</th>
                      <th className="has-text-right">Total Amount</th>
                      <th>Status</th>
                      <th>Payment Method</th>
                      <th>Created at</th>
                      <th style={{ width: 120 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length ? (
                      filtered.map((r, idx) => {
                        const uniqVendors = Array.from(new Set((r.details || []).map((d) => d.voucher?.vendor_id).filter(Boolean)));
                        const vendorLabel = !uniqVendors.length ? "—" : uniqVendors.length === 1 ? `Vendor ${uniqVendors[0]}` : `Vendor ${uniqVendors[0]} +${uniqVendors.length - 1}`;
                        return (
                          <tr key={r.id}>
                            <td>{(page - 1) * pageSize + idx + 1}</td>
                            <td className="has-text-weight-medium">#{r.code_trx}</td>
                            <td>{r.member?.name_member || "—"}</td>
                            <td>{vendorLabel}</td>
                            <td>{Array.isArray(r.details) ? r.details.length : 0}</td>
                            <td className="has-text-right">{toRinggit(r.totalAmount)}</td>
                            <td>{statusBadge(r.status)}</td>
                            <td>{r.payment_methode || "—"}</td>
                            <td>{fmtDateTime(r.created_at || r.date_order)}</td>
                            <td>
                              <div className="buttons are-small">
                                <button className="button is-info is-light" onClick={() => openDetailModal(r)}>Details</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={10} className="has-text-centered has-text-grey">No data</td></tr>
                    )}
                  </tbody>
                  {filtered.length > 0 && (
                    <tfoot>
                      <tr>
                        <th colSpan={5}>TOTAL</th>
                        <th className="has-text-right">{toRinggit(totals.omzet)}</th>
                        <th colSpan={4} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="level mt-3">
              <div className="level-left">
                <p className="is-size-7 has-text-grey">Page {page} of {totalPages}</p>
              </div>
              <div className="level-right">
                <nav className="pagination is-small" role="navigation" aria-label="pagination">
                  <button className="pagination-ctrl" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
                  <button className="page-dot is-current">{page}</button>
                  {page < totalPages && <button className="page-dot" onClick={() => setPage(page + 1)}>{page + 1}</button>}
                  {page + 1 < totalPages && <button className="page-dot" onClick={() => setPage(page + 2)}>{page + 2}</button>}
                  <button className="pagination-ctrl" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <div className={`modal ${openDetail ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setOpenDetail(false)} />
        <div className="modal-card" style={{ width: "90%", maxWidth: 1100 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Order Details</p>
            <button className="delete" aria-label="close" onClick={() => setOpenDetail(false)} />
          </header>
          <section className="modal-card-body">
            <div ref={detailRef}>
              {detailHeader && (
                <>
                  <div className="columns is-multiline">
                    <div className="column is-4">
                      <p><strong>Order Code:</strong> {detailHeader.id}</p>
                      <p><strong>Created At:</strong> {fmtDateTime(detailHeader.createdAt)}</p>
                    </div>
                    <div className="column is-4">
                      <p><strong>Customer:</strong> {detailHeader.customerName}</p>
                      <p><strong>Gateway:</strong> {detailHeader.gateway}</p>
                    </div>
                    <div className="column is-4">
                      <p><strong>Status:</strong> {detailHeader.paymentStatus}</p>
                      <p><strong>Total:</strong> {toRinggit(detailHeader.totalAmount)}</p>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="table is-fullwidth is-striped is-hoverable">
                      <thead>
                        <tr>
                          <th style={{ width: 64 }}>No</th>
                          <th>Code</th>
                          <th>Voucher Name</th>
                          <th>Vendor</th>
                          <th className="has-text-right" style={{ width: 120 }}>Qty</th>
                          <th className="has-text-right" style={{ width: 160 }}>Price</th>
                          <th className="has-text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailItems.length ? (
                          detailItems.map((it, idx) => (
                            <tr key={it.detail_id}>
                              <td>{idx + 1}</td>
                              <td className="has-text-weight-medium">{it.code_item}</td>
                              <td>{it.item_name}</td>
                              <td>{it.vendor}</td>
                              <td className="has-text-right">{it.qty}</td>
                              <td className="has-text-right">{toRinggit(it.price)}</td>
                              <td className="has-text-right">{toRinggit(it.qty * it.price)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={7} className="has-text-centered">No details</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>
          <footer className="modal-card-foot is-justify-content-space-between">
            <div className="buttons">
              <button className="button is-link" onClick={exportOrdersCSV} disabled={!filtered.length}>Export Orders CSV</button>
              <button className="button" onClick={printDetail} disabled={!detailItems.length}>Print Details</button>
            </div>
            <button className="button" onClick={() => setOpenDetail(false)}>Close</button>
          </footer>
        </div>
      </div>

      {/* Create Order Modal */}
      <div className={`modal ${openCreate ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setOpenCreate(false)} />
        <div className="modal-card" style={{ width: "95%", maxWidth: 1200 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Create Order</p>
            <button className="delete" aria-label="close" onClick={() => setOpenCreate(false)} />
          </header>
          <section className="modal-card-body">
            {/* Member & Vendor */}
            <div className="columns is-multiline">
              <div className="column is-4">
                <label className="label">Member</label>
                <div className={`select is-fullwidth ${membersLoading ? "is-loading" : ""}`}>
                  <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                    <option value="">-- Select Member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name_member || "-"}{m.email ? ` · ${m.email}` : ""}{m.code_member ? ` · ${m.code_member}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {membersErr && <p className="help is-danger mt-1">{membersErr}</p>}
              </div>

              <div className="column is-4">
                <label className="label">Vendor (optional to filter vouchers)</label>
                <div className={`select is-fullwidth ${vendorsCreateLoading ? "is-loading" : ""}`}>
                  <select value={vendorPick} onChange={(e) => setVendorPick(e.target.value)}>
                    <option value="">-- Select Vendor --</option>
                    {vendorsCreate.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}{v.city ? ` · ${v.city}` : ""}{v.code_vendor ? ` · ${v.code_vendor}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {vendorsCreateErr && <p className="help is-danger mt-1">{vendorsCreateErr}</p>}
              </div>

              <div className="column is-4">
                <div className="field">
                  <label className="label">Payment Method</label>
                  <div className="select is-fullwidth">
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option>Bank Transfer</option>
                      <option>Credit Card</option>
                      <option>Cash</option>
                      <option>Manual</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="table-container">
              <table className="table is-fullwidth is-striped is-hoverable">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>#</th>
                    <th>Voucher</th>
                    <th style={{ width: 120 }} className="has-text-right">Qty</th>
                    <th style={{ width: 200 }} className="has-text-right">Price</th>
                    <th className="has-text-right">Subtotal</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {createItems.map((it, idx) => {
                    const state = voucherLists[it.id] || { options: [], loading: false, err: "", search: "" };
                    const selected = state.options.find((v) => String(v.id) === String(it.voucher_id));
                    return (
                      <tr key={it.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div className={`select is-fullwidth ${state.loading ? "is-loading" : ""}`}>
                            <select
                              value={it.voucher_id}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCreateRow(it.id, "voucher_id", val);
                                const v = state.options.find((o) => String(o.id) === String(val));
                                if (v) updateCreateRow(it.id, "price", Number(v.price || 0));
                              }}
                            >
                              <option value="">-- Select Voucher --</option>
                              {state.options.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.title} · ID {v.id} · {toRinggit(Number(v.price || 0))}
                                </option>
                              ))}
                            </select>
                          </div>
                          {state.err && <p className="help is-danger">{state.err}</p>}
                          {selected?.vendor_id && vendorPick && String(selected.vendor_id) !== String(vendorPick) && (
                            <p className="help is-warning">* Voucher vendor #{selected.vendor_id} differs from the selected vendor filter.</p>
                          )}
                        </td>
                        <td className="has-text-right">
                          <input
                            className="input is-small has-text-right"
                            type="number"
                            min="1"
                            step="1"
                            value={it.qty}
                            onChange={(e) => updateCreateRow(it.id, "qty", e.target.value)}
                          />
                        </td>
                        <td className="has-text-right">
                          <input
                            className="input is-small has-text-right"
                            type="number"
                            min="0"
                            step="1"
                            value={it.price}
                            onChange={(e) => updateCreateRow(it.id, "price", e.target.value)}
                          />
                        </td>
                        <td className="has-text-right">{toRinggit(Number(it.qty || 0) * Number(it.price || 0))}</td>
                        <td>
                          <div className="buttons are-small">
                            <button className="button is-danger is-light" onClick={() => removeCreateRow(it.id)}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={2}>
                      <button className="button is-small" onClick={addCreateRow}>+ Add Item</button>
                    </th>
                    <th className="has-text-right">TOTAL</th>
                    <th className="has-text-right">{toRinggit(createTotal)}</th>
                    <th colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
          <footer className="modal-card-foot is-justify-content-flex-end">
            <button className="button" onClick={() => setOpenCreate(false)}>Cancel</button>
            <button className={`button is-primary ${saving ? "is-loading" : ""}`} onClick={submitCreate} disabled={saving || !createItems.length}>
              Create Order
            </button>
          </footer>
        </div>
      </div>
    </section>
  );
}

/* ---- Styles to match the design (no side gap, soft card, nice toolbar) ---- */
const pageCss = `
.vendor-page.section { padding-left: 0; padding-right: 0; }
.vendor-page .container.is-fluid { max-width: none; width: 100%; }
.vp-shell { margin-left: 0; margin-right: 0; }
.soft-card { border: 1px solid #eceff4; border-radius: 14px; box-shadow: 0 4px 20px rgba(20,20,43,.06); }

/* toolbar pills */
.toolbar-row { display:flex; flex-wrap:wrap; gap:.6rem; align-items:center; }
.pill { display:flex; align-items:center; }
.select-pill select, .toolbar .input { border-radius:9999px !important; background:#f7f8fb; border-color:#e9edf2; }
.pill-search { min-width:260px; }
.date-wrap { display:flex; align-items:center; gap:.4rem; }
.input-date { width:150px; }

/* table */
.table-wrap { border:1px solid #eef1f6; border-radius:12px; overflow:hidden; }
.affiliate-table thead th { background:#fbfcfe; color:#6b7280; font-weight:600; font-size:.85rem; border-color:#eef1f6; }

/* pagination buttons (match look) */
.pagination-ctrl, .page-dot { border:1px solid #e7eaf0; background:#fff; border-radius:8px; padding:6px 10px; margin-left:6px; }
.page-dot.is-current { background:#6d28d9; border-color:#6d28d9; color:#fff; }
.pagination-ctrl[disabled], .page-dot[disabled] { opacity:.5; cursor:not-allowed; }
`;
