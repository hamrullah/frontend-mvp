import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_BASE = "https://backend-mvp-nine.vercel.app/api";

const STATUS_LABEL = { 1: "Completed", 0: "Pending", 2: "Cancelled", 3: "Refunded", 4: "Paid" };
const STATUS_TAG = { Completed: "is-success", Pending: "is-warning", Cancelled: "is-danger", Refunded: "is-light", Paid: "is-primary" };

export default function OrdersPage() {
  // ====== state utama
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  // toolbar & filter
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
  const [memberSearch, setMemberSearch] = useState("");

  // Vendor dropdown (opsional sebagai referensi filter voucher)
  const [vendorPick, setVendorPick] = useState("");
  const [vendorsCreate, setVendorsCreate] = useState([]);
  const [vendorsCreateLoading, setVendorsCreateLoading] = useState(false);
  const [vendorsCreateErr, setVendorsCreateErr] = useState("");
  const [vendorCreateSearch, setVendorCreateSearch] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");

  // Items yang akan dibuat
  const [createItems, setCreateItems] = useState([{ id: 1, voucher_id: "", qty: 1, price: "" }]);

  // Voucher list per baris (dropdown)
  // shape: { [rowId]: { options: [], loading: false, err: "", search: "" } }
  const [voucherLists, setVoucherLists] = useState({});

  const token = (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authHeaders = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };

  // ===== Helpers
  const toRupiah = (n) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(Number(n || 0));
  const fmtTanggal = (s) => (s ? new Date(s).toLocaleString("id-ID") : "—");
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
      setErr(e?.response?.data?.error || "Gagal mengambil data order");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchOrders(); /* eslint-disable-next-line */ }, [page, pageSize]);

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
        code_barang: it.voucher?.code_voucher || it.voucher_id,
        nama_barang: it.voucher?.title || "Voucher",
        vendor: it.voucher?.vendor_id || "-",
        qty: Number(it.qty || 0),
        harga: Number(it.price || 0),
      }))
    );
  };

  // ===== Member/Vendor dropdown (create modal)
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
      setMembersErr(e?.response?.data?.error || "Gagal memuat member");
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
      setVendorsCreateErr(e?.response?.data?.error || "Gagal memuat vendor");
      setVendorsCreate([]);
    } finally {
      setVendorsCreateLoading(false);
    }
  };

  // ===== Voucher dropdown per baris
  const loadVouchersForRow = async (rowId, search = "") => {
    try {
      updateVoucherListState(rowId, { loading: true, err: "" });
      const params = { limit: 50, offset: 0 };
      if (search) params.q = search;
      if (vendorPick) params.vendor_id = vendorPick; // filter by vendor bila dipilih
      const { data } = await axios.get(`${API_BASE}/voucher/list-voucher`, { params, headers: authHeaders });
      const rows = Array.isArray(data?.vouchers) ? data.vouchers : Array.isArray(data?.data) ? data.data : [];
      updateVoucherListState(rowId, { options: rows, loading: false });
    } catch (e) {
      console.error(e);
      updateVoucherListState(rowId, { loading: false, err: e?.response?.data?.error || "Gagal memuat voucher" });
    }
  };

  // buka modal -> load members, vendors, dan voucher untuk setiap baris
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

  useEffect(() => { if (openCreate) { loadMembers(""); loadVendorsCreate(""); } }, [openCreate]); // init dropdowns
  // debounce member search & vendor search
  useEffect(() => {
    if (!openCreate) return;
    const t = setTimeout(() => loadMembers(memberSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [memberSearch, openCreate]);
  useEffect(() => {
    if (!openCreate) return;
    const t = setTimeout(() => loadVendorsCreate(vendorCreateSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [vendorCreateSearch, openCreate]);

  // load vouchers untuk setiap baris saat modal dibuka, vendorPick berubah, atau keyword per baris berubah
  const voucherSearchKey = useMemo(
    () => createItems.map((r) => voucherLists[r.id]?.search || "").join("|"),
    [createItems, voucherLists]
  );
  useEffect(() => {
    if (!openCreate) return;
    const timers = createItems.map((row) =>
      setTimeout(() => {
        const s = voucherLists[row.id]?.search || "";
        loadVouchersForRow(row.id, s.trim());
      }, 300)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreate, vendorPick, voucherSearchKey, createItems.length]);

  // Items helpers
  const addCreateRow = () => {
    setCreateItems((prev) => {
      const id = prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1;
      // init state dropdown row baru
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
    if (!memberId) return "member_id wajib diisi";
    if (!createItems.length) return "Minimal 1 item";
    for (let i = 0; i < createItems.length; i++) {
      const it = createItems[i];
      if (!it.voucher_id) return `voucher di baris ${i + 1} wajib dipilih`;
      if (!Number.isInteger(Number(it.qty)) || Number(it.qty) <= 0) return `qty di baris ${i + 1} tidak valid`;
      if (!Number.isFinite(Number(it.price)) || Number(it.price) < 0) return `price di baris ${i + 1} tidak valid`;
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
      setSuccess(`Order ${data?.data?.code_trx || ""} berhasil dibuat.`);
      fetchOrders();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || "Gagal membuat order.");
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
      { label: "Created at", value: (r) => fmtTanggal(r.created_at || r.date_order) },
    ];
    downloadCSV(`orders_${Date.now()}.csv`, filtered, cols);
  };
  const applyFilters = () => { setPage(1); fetchOrders(); };
  const clearFilters = () => { setStatusFilter(""); setPmFilter(""); setVendorFilter(""); setFrom(""); setTo(""); setQuery(""); setPage(1); fetchOrders(); };

  // ===== Cetak detail
  const printDetail = () => {
    if (!detailRef.current) return;
    const win = window.open("", "PRINT", "width=900,height=650"); if (!win) return;
    const html = `
      <html>
        <head>
          <title>Order Detail</title>
          <style>body{font-family:Arial,sans-serif}th,td{border:1px solid #ddd;padding:8px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5}</style>
        </head>
        <body>${detailRef.current.innerHTML}<script>window.print()</script></body>
      </html>`;
    win.document.open(); win.document.write(html); win.document.close();
  };

  // ===== UI
  return (
    <section className="section">
      <div className="container">
        <h1 className="title">Order</h1>

        {/* Toolbar */}
        <div className="box">
          <div className="columns is-multiline is-vcentered">
            <div className="column is-narrow">
              <div className="select">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="column is-narrow">
              <div className="select">
                <select value={pmFilter} onChange={(e) => setPmFilter(e.target.value)}>
                  <option value="">Payment Method</option>
                  {paymentOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="column is-narrow">
              <div className="select">
                <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
                  <option value="">Vendor</option>
                  {vendorOptions.map((v) => <option key={v} value={v}>Vendor {v}</option>)}
                </select>
              </div>
            </div>
            <div className="column is-narrow"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="column is-narrow"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="column"><input className="input" placeholder="Order code / buyer / vendor" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            <div className="column is-narrow"><button className="button" onClick={applyFilters}>Apply</button></div>
            <div className="column is-narrow"><button className="button is-light" onClick={clearFilters}>Reset</button></div>
            <div className="column is-narrow"><button className="button is-link" onClick={exportOrdersCSV} disabled={!filtered.length}>Export</button></div>
            <div className="column is-narrow"><button className="button is-danger" onClick={openCreateModal}>+ Create Order</button></div>
          </div>
        </div>

        {/* Alerts */}
        {err && <div className="notification is-danger is-light">{err}</div>}
        {success && <div className="notification is-success is-light">{success}</div>}
        {loading && <progress className="progress is-small is-primary" max="100">Loading…</progress>}

        {/* Tabel Orders */}
        <div className="card">
          <div className="card-content">
            <div className="table-container">
              <table className="table is-fullwidth is-striped is-hoverable">
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
                          <td className="has-text-right">{toRupiah(r.totalAmount)}</td>
                          <td>{statusBadge(r.status)}</td>
                          <td>{r.payment_methode || "—"}</td>
                          <td>{fmtTanggal(r.created_at || r.date_order)}</td>
                          <td>
                            <div className="buttons are-small">
                              <button className="button is-info is-light" onClick={() => openDetailModal(r)}>Detail</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={10} className="has-text-centered has-text-grey">Tidak ada data</td></tr>
                  )}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr>
                      <th colSpan={5}>TOTAL</th>
                      <th className="has-text-right">{toRupiah(totals.omzet)}</th>
                      <th colSpan={4} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination */}
            <nav className="pagination is-centered" role="navigation" aria-label="pagination">
              <button className="pagination-previous" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <button className="pagination-next" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
              <ul className="pagination-list">
                <li><span className="pagination-link is-current">{page}</span></li>
                {page < totalPages && <li><button className="pagination-link" onClick={() => setPage(page + 1)}>{page + 1}</button></li>}
                {page + 1 < totalPages && <li><button className="pagination-link" onClick={() => setPage(page + 2)}>{page + 2}</button></li>}
              </ul>
            </nav>

            <p className="has-text-grey is-size-7">Page {page} of {totalPages}</p>
          </div>
        </div>
      </div>

      {/* Modal Detail */}
      <div className={`modal ${openDetail ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setOpenDetail(false)} />
        <div className="modal-card" style={{ width: "90%", maxWidth: 1100 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Detail Order</p>
            <button className="delete" aria-label="close" onClick={() => setOpenDetail(false)} />
          </header>
          <section className="modal-card-body">
            <div ref={detailRef}>
              {detailHeader && (
                <>
                  <div className="columns is-multiline">
                    <div className="column is-4">
                      <p><strong>Order Code:</strong> {detailHeader.id}</p>
                      <p><strong>Created At:</strong> {fmtTanggal(detailHeader.createdAt)}</p>
                    </div>
                    <div className="column is-4">
                      <p><strong>Customer:</strong> {detailHeader.customerName}</p>
                      <p><strong>Gateway:</strong> {detailHeader.gateway}</p>
                    </div>
                    <div className="column is-4">
                      <p><strong>Status:</strong> {detailHeader.paymentStatus}</p>
                      <p><strong>Total:</strong> {toRupiah(detailHeader.totalAmount)}</p>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="table is-fullwidth is-striped is-hoverable">
                      <thead>
                        <tr>
                          <th style={{ width: 64 }}>No</th>
                          <th>Kode</th>
                          <th>Nama Voucher</th>
                          <th>Vendor</th>
                          <th className="has-text-right" style={{ width: 120 }}>Qty</th>
                          <th className="has-text-right" style={{ width: 160 }}>Harga</th>
                          <th className="has-text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailItems.length ? (
                          detailItems.map((it, idx) => (
                            <tr key={it.detail_id}>
                              <td>{idx + 1}</td>
                              <td className="has-text-weight-medium">{it.code_barang}</td>
                              <td>{it.nama_barang}</td>
                              <td>{it.vendor}</td>
                              <td className="has-text-right">{it.qty}</td>
                              <td className="has-text-right">{toRupiah(it.harga)}</td>
                              <td className="has-text-right">{toRupiah(it.qty * it.harga)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={7} className="has-text-centered">Detail kosong</td></tr>
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
              <button className="button" onClick={printDetail} disabled={!detailItems.length}>Cetak Detail</button>
            </div>
            <button className="button" onClick={() => setOpenDetail(false)}>Close</button>
          </footer>
        </div>
      </div>

      {/* Modal Create Order */}
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
                <div className="field has-addons">
                  <p className="control is-expanded">
                    <div className={`select is-fullwidth ${membersLoading ? "is-loading" : ""}`}>
                      <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                        <option value="">-- Pilih Member --</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name_member || "-"}{m.email ? ` · ${m.email}` : ""}{m.code_member ? ` · ${m.code_member}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </p>
                  
                </div>
                {membersErr && <p className="help is-danger mt-1">{membersErr}</p>}
              </div>

              <div className="column is-4">
                <label className="label">Vendor (opsional untuk filter voucher)</label>
                <div className="field has-addons">
                  <p className="control is-expanded">
                    <div className={`select is-fullwidth ${vendorsCreateLoading ? "is-loading" : ""}`}>
                      <select value={vendorPick} onChange={(e) => setVendorPick(e.target.value)}>
                        <option value="">-- Pilih Vendor --</option>
                        {vendorsCreate.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}{v.city ? ` · ${v.city}` : ""}{v.code_vendor ? ` · ${v.code_vendor}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </p>
                 
                </div>
                {vendorsCreateErr && <p className="help is-danger mt-1">{vendorsCreateErr}</p>}
              </div>

              <div className="column is-4">
                <div className="field">
                  <label className="label">Payment Method</label>
                  <div className="control">
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
            </div>

            {/* Items (voucher dari list-voucher) */}
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
                          <div className="field has-addons">
                            <p className="control is-expanded">
                              <div className={`select is-fullwidth ${state.loading ? "is-loading" : ""}`}>
                                <select
                                  value={it.voucher_id}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateCreateRow(it.id, "voucher_id", val);
                                    // auto-set price dari voucher terpilih
                                    const v = state.options.find((o) => String(o.id) === String(val));
                                    if (v) updateCreateRow(it.id, "price", Number(v.price || 0));
                                  }}
                                >
                                  <option value="">-- Pilih Voucher --</option>
                                  {state.options.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.title} · ID {v.id} · Rp{Number(v.price || 0).toLocaleString("id-ID")}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </p>
                           
                          </div>
                          {state.err && <p className="help is-danger">{state.err}</p>}
                          {selected?.vendor_id && vendorPick && String(selected.vendor_id) !== String(vendorPick) && (
                            <p className="help is-warning">* Voucher vendor #{selected.vendor_id}, berbeda dengan filter vendor yang dipilih.</p>
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
                        <td className="has-text-right">{toRupiah(Number(it.qty || 0) * Number(it.price || 0))}</td>
                        <td>
                          <div className="buttons are-small">
                            <button className="button is-danger is-light" onClick={() => removeCreateRow(it.id)}>Hapus</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={2}>
                      <button className="button is-small" onClick={addCreateRow}>+ Tambah Item</button>
                    </th>
                    <th className="has-text-right">TOTAL</th>
                    <th className="has-text-right">{toRupiah(createTotal)}</th>
                    <th colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
          <footer className="modal-card-foot is-justify-content-flex-end">
            <button className="button" onClick={() => setOpenCreate(false)}>Cancel</button>
            <button className={`button is-primary ${saving ? "is-loading" : ""}`} onClick={submitCreate} disabled={saving || !createItems.length}>
              Buat Order
            </button>
          </footer>
        </div>
      </div>
    </section>
  );
}
