// src/pages/VoucherList.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  IoSearch,
  IoAdd,
  IoEyeOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoRefreshOutline,
  IoCloudDownloadOutline,
} from "react-icons/io5";

const API_BASE = "https://backend-mvp-nine.vercel.app/api"; // use "/api" if via proxy

// ---------- Helpers ----------
const money = (v) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(Number(v || 0));

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" });
};

const toIso = (localStr) => new Date(localStr).toISOString();

const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
};

const STATUS_LABEL = (s) => ({ 1: "Active", 0: "Inactive", 2: "Draft" }[Number(s)] || "Draft");
const statusChipClass = (s) =>
  ({
    Active: "chip chip--active",
    Inactive: "chip chip--inactive",
    Draft: "chip chip--draft",
  }[STATUS_LABEL(s)] || "chip");

// image source in detail
const imgUrl = (img) => img?.url || (img?.file ? `http://localhost:3000${img.file}` : "");

// =====================================================

export default function VoucherList() {
  // ======= list =======
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // pagination & toolbar filters
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | 1 | 0 | 2

  // ======= add =======
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    startAtLocal: "",
    endAtLocal: "",
    totalInventory: 0,
    monthlyLimit: "", // NEW: per-user monthly usage limit (optional; default 0 = unlimited)
    vendorId: "",
    categoryId: "",
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  // ======= edit =======
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    price: "",
    endAtLocal: "",
    status: "Draft",
  });

  // ======= detail =======
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState(null);

  // ======= vendor & category dropdowns =======
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsErr, setVendorsErr] = useState("");

  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catErr, setCatErr] = useState("");

  // auth header
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // ------- fetch list -------
  const fetchVouchers = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await axios.get(`${API_BASE}/voucher/list-voucher`, {
        params: { limit, offset },
        headers: { ...authHeader, "Content-Type": "application/json" },
      });
      const rows = Array.isArray(data?.vouchers) ? data.vouchers : [];
      setList(rows);
      setTotal(Number(data?.pagination?.total ?? rows.length));
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || "Failed to fetch vouchers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset]);

  // ------- vendors & categories -------
  async function loadVendors() {
    setVendorsLoading(true);
    setVendorsErr("");
    try {
      const { data } = await axios.get(`${API_BASE}/vendor/list-vendor`, {
        params: { limit: 100, offset: 0, status: 1, sortBy: "name", sortDir: "asc" },
        headers: { ...authHeader, "Content-Type": "application/json" },
      });
      setVendors(Array.isArray(data?.vendors) ? data.vendors : []);
    } catch (e) {
      setVendorsErr(e?.response?.data?.error || "Failed to load vendors");
      setVendors([]);
    } finally {
      setVendorsLoading(false);
    }
  }
  async function loadCategories() {
    setCatLoading(true);
    setCatErr("");
    try {
      const { data } = await axios.get(`${API_BASE}/category/list-category`, {
        params: { limit: 100, offset: 0, status: 1, sortBy: "category_name", sortDir: "asc" },
        headers: { ...authHeader, "Content-Type": "application/json" },
      });
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    } catch (e) {
      setCatErr(e?.response?.data?.error || "Failed to load categories");
      setCategories([]);
    } finally {
      setCatLoading(false);
    }
  }
  useEffect(() => {
    if (addOpen) {
      loadVendors();
      loadCategories();
    }
  }, [addOpen]);

  // ------- derived view-model -------
  const categoryById = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(c.id, c.category_name));
    return m;
  }, [categories]);

  const applied = useMemo(() => {
    let r = list;
    if (statusFilter !== "ALL") r = r.filter((v) => String(v.status) === String(statusFilter));
    const needle = q.trim().toLowerCase();
    if (needle) {
      r = r.filter((v) =>
        `${v.code || v.code_voucher || ""} ${v.title || ""} ${STATUS_LABEL(v.status)}`.toLowerCase().includes(needle)
      );
    }
    return r;
  }, [list, q, statusFilter]);

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  const next = () => setOffset((o) => Math.min(o + limit, (pages - 1) * limit));
  const prev = () => setOffset((o) => Math.max(0, o - limit));

  // ------- stat cards -------
  const totalAll = total || list.length;
  const totalActive = (list || []).filter((v) => Number(v.status) === 1).length;
  const totalInactive = (list || []).filter((v) => Number(v.status) !== 1).length;

  // ------- handlers: add -------
  const validateForm = () => {
    if (!form.title.trim()) return "Title is required";
    if (!form.vendorId) return "Vendor is required";
    if (!form.categoryId) return "Category is required";
    const priceNum = Number(form.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return "Invalid price";
    if (!form.startAtLocal || !form.endAtLocal) return "Start & end date are required";
    const start = new Date(form.startAtLocal);
    const end = new Date(form.endAtLocal);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Invalid date format";
    if (end <= start) return "End date must be after start date";
    const inv = Number(form.totalInventory);
    if (!Number.isInteger(inv) || inv < 0) return "Inventory must be an integer ≥ 0";

    // NEW: monthly limit (optional, default 0). Validate only if provided.
    if (form.monthlyLimit !== "" && (!Number.isInteger(Number(form.monthlyLimit)) || Number(form.monthlyLimit) < 0)) {
      return "Monthly usage limit must be an integer ≥ 0";
    }
    return "";
  };

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const max = 5 * 1024 * 1024;
    const valids = files.filter((f) => f.type.startsWith("image/") && f.size <= max);
    setImages(valids);
    setPreviews(valids.map((f) => URL.createObjectURL(f)));
  };
  const removeImageAt = (idx) => {
    URL.revokeObjectURL(previews[idx]);
    setImages((a) => a.filter((_, i) => i !== idx));
    setPreviews((a) => a.filter((_, i) => i !== idx));
  };
  const resetAddForm = () => {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setImages([]);
    setPreviews([]);
    setForm({
      title: "",
      description: "",
      price: "",
      startAtLocal: "",
      endAtLocal: "",
      totalInventory: 0,
      monthlyLimit: "",
      vendorId: "",
      categoryId: "",
    });
  };

  const onAdd = async () => {
    const msg = validateForm();
    if (msg) {
      setAddError(msg);
      return;
    }
    setSaving(true);
    setAddError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("description", form.description || "");
      fd.append("vendor_id", String(form.vendorId));
      fd.append("category_voucher_id", String(form.categoryId));
      fd.append("inventory", String(form.totalInventory));
      fd.append("price", Number(form.price).toFixed(2));
      fd.append("startAt", toIso(form.startAtLocal));
      fd.append("endAt", toIso(form.endAtLocal));

      // NEW: send monthly limit (default 0 = unlimited)
      const monthly = Number(form.monthlyLimit);
      fd.append(
        "monthly_usage_limit",
        Number.isInteger(monthly) && monthly >= 0 ? String(monthly) : "0"
      );

      images.forEach((file) => fd.append("images", file));

      await axios.post(`${API_BASE}/voucher/add-voucher`, fd, { headers: { ...authHeader } });

      setAddOpen(false);
      resetAddForm();
      setOffset(0);
      fetchVouchers();
    } catch (e) {
      console.error(e);
      setAddError(e?.response?.data?.error || "Failed to add voucher");
    } finally {
      setSaving(false);
    }
  };

  // ------- edit -------
  const openEdit = (v) => {
    setEditError("");
    setEditForm({
      id: v.id,
      title: v.title || "",
      price: String(v.price ?? ""),
      endAtLocal: toLocalInput(v.end),
      status: STATUS_LABEL(v.status),
    });
    setEditOpen(true);
  };
  const validateEdit = () => {
    if (!editForm.id) return "Invalid voucher data";
    if (!editForm.title.trim()) return "Title is required";
    const priceNum = Number(editForm.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return "Invalid price";
    if (!editForm.endAtLocal) return "End date is required";
    if (!["Active", "Draft", "Inactive"].includes(editForm.status)) return "Invalid status";
    return "";
  };
  const onUpdate = async () => {
    const msg = validateEdit();
    if (msg) {
      setEditError(msg);
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const payload = {
        title: editForm.title.trim(),
        price: Number(editForm.price).toFixed(2),
        endAt: toIso(editForm.endAtLocal),
        status: editForm.status.toUpperCase(),
      };
      await axios.put(`${API_BASE}/voucher/${editForm.id}`, payload, {
        headers: { ...authHeader, "Content-Type": "application/json" },
      });
      setEditOpen(false);
      fetchVouchers();
    } catch (e) {
      console.error(e);
      setEditError(e?.response?.data?.error || "Failed to update voucher");
    } finally {
      setEditSaving(false);
    }
  };

  // ------- detail -------
  const fetchVoucherDetail = async (id) => {
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    try {
      const { data } = await axios.get(`${API_BASE}/voucher/${id}`, { headers: { ...authHeader } });
      setDetail(data?.voucher || null);
      setDetailOpen(true);
    } catch (e) {
      setDetailError(e?.response?.data?.error || "Failed to load voucher details");
      setDetailOpen(true);
    } finally {
      setDetailLoading(false);
    }
  };
  const openDetail = (v) => fetchVoucherDetail(v.id);

  // =====================================================

  return (
    <section className="section voucher-page">
      <style>{styles}</style>
      <br/>

      <div className="vp-shell card">
        <div className="vp-head">
          <h1>Voucher Manager</h1>
          <div className="vp-actions">
            <button className="btn ghost">
              <IoCloudDownloadOutline /> Export
            </button>
            <button className="btn primary" onClick={() => setAddOpen(true)}>
              <IoAdd /> Add Voucher
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="vp-stats">
          <div className="stat">
            <div className="stat-top">TOTAL VOUCHERS</div>
            <div className="stat-mid">{totalAll}</div>
          </div>

          <div className="stat">
            <div className="stat-top between">
              <span>ACTIVE VOUCHERS</span>
              <button className="icon-ghost" onClick={fetchVouchers} title="Refresh">
                <IoRefreshOutline />
              </button>
            </div>
            <div className="stat-mid">{totalActive}</div>
          </div>

          <div className="stat">
            <div className="stat-top between">
              <span>INACTIVE VOUCHERS</span>
              <button className="icon-ghost" onClick={fetchVouchers} title="Refresh">
                <IoRefreshOutline />
              </button>
            </div>
            <div className="stat-mid">{totalInactive}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="vp-toolbar">
          <div className="search">
            <span className="icon"><IoSearch /></span>
            <input
              placeholder="Search…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOffset(0);
              }}
            />
          </div>

          <div className="select-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Vouchers</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
              <option value="2">Draft</option>
            </select>
          </div>

          <div className="right-controls">
            <div className="select-wrap sm">
              <select
                value={limit}
                onChange={(e) => {
                  const v = Number(e.target.value) || 10;
                  setLimit(v);
                  setOffset(0);
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}/page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="vp-table card">
          {err && <div className="notification is-danger is-light">{err}</div>}
          {loading && <progress className="progress is-small is-primary" max="100">Loading…</progress>}

          <div className="table-container">
            <table className="table is-fullwidth is-hoverable">
              <thead>
                <tr>
                  <th style={{ width: 38 }}>
                    <label className="checkbox">
                      <input type="checkbox" onChange={() => {}} />
                    </label>
                  </th>
                  <th style={{ width: 116 }}>Actions</th>
                  <th>Voucher Code</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th className="has-text-right">Price</th> {/* FIXED: show price, not discount */}
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th className="has-text-right">Inventory</th>
                  <th className="has-text-right">Monthly Limit</th> {/* NEW */}
                  <th>Status</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {applied.length ? (
                  applied.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <label className="checkbox"><input type="checkbox" /></label>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-ghost" title="View" onClick={() => openDetail(v)}>
                            <IoEyeOutline />
                          </button>
                          <button className="icon-ghost" title="Edit" onClick={() => openEdit(v)}>
                            <IoPencilOutline />
                          </button>
                          <button className="icon-ghost danger" title="Delete" onClick={() => alert("Confirm delete?")}>
                            <IoTrashOutline />
                          </button>
                        </div>
                      </td>
                      <td className="muted">#{v.code || v.code_voucher || "-"}</td>
                      <td className="strong">{v.title || "-"}</td>
                      <td className="muted">
                        {categoryById.get(v.category_voucher_id) || v.category_name || "-"}
                      </td>
                      <td className="has-text-right">{money(v.price)}</td>
                      <td>{fmtDate(v.start)}</td>
                      <td>{fmtDate(v.end)}</td>
                      <td className="has-text-right">{Number.isFinite(v.inventory) ? v.inventory : "-"}</td>
                      <td className="has-text-right">
                        {Number.isFinite(v.monthly_usage_limit) ? v.monthly_usage_limit : (v.monthly_usage_limit ?? "-")}
                      </td>
                      <td>
                        <span className={statusChipClass(v.status)}>{STATUS_LABEL(v.status)}</span>
                      </td>
                      <td>{fmtDate(v.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="has-text-centered has-text-grey">No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="vp-pagination">
            <button className="pg-ctrl" onClick={prev} disabled={page <= 1}>‹</button>
            <span className={`pg-dot ${page === 1 ? "is-current" : ""}`}>1</span>
            {page > 2 && <span className="pg-dot" onClick={() => setOffset(limit * (page - 2))}>{page - 1}</span>}
            <span className="pg-dot is-current">{page}</span>
            {page + 1 <= pages && <span className="pg-dot" onClick={() => setOffset(limit * page)}>{page + 1}</span>}
            {page + 2 < pages && <span className="pg-ellipsis">…</span>}
            {pages > 1 && <span className="pg-dot" onClick={() => setOffset(limit * (pages - 1))}>{pages}</span>}
            <button className="pg-ctrl" onClick={next} disabled={page >= pages}>›</button>
          </div>

          <p className="is-size-7 has-text-grey">Page {page} of {pages}</p>
        </div>
      </div>

      {/* ADD MODAL */}
      <div className={`modal ${addOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setAddOpen(false)} />
        <div className="modal-card" style={{ maxWidth: 820 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Add Voucher</p>
            <button className="delete" aria-label="close" onClick={() => setAddOpen(false)} />
          </header>
          <section className="modal-card-body">
            {addError && <div className="notification is-danger is-light">{addError}</div>}

            <div className="columns">
              <div className="column">
                <div className="field">
                  <label className="label">Title</label>
                  <input
                    className="input"
                    placeholder="50% Discount Voucher"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
              </div>
              <div className="column">
                <div className="field">
                  <label className="label">Price (MYR)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="100.00"
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  />
                  <p className="help">Sent as a 2-decimal string, e.g., 100.00</p>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="label">Description</label>
              <textarea
                className="textarea"
                placeholder="Voucher description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="columns">
              <div className="column">
                <div className="field">
                  <label className="label">Vendor</label>
                  <div className={`select is-fullwidth ${vendorsLoading ? "is-loading" : ""}`}>
                    <select
                      value={form.vendorId}
                      onChange={(e) => setForm((p) => ({ ...p, vendorId: e.target.value }))}
                    >
                      <option value="">-- Select Vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}{v.city ? ` · ${v.city}` : ""}{v.code_vendor ? ` · ${v.code_vendor}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {vendorsErr && <p className="help is-danger mt-1">{vendorsErr}</p>}
                </div>
              </div>

              <div className="column">
                <div className="field">
                  <label className="label">Category</label>
                  <div className={`select is-fullwidth ${catLoading ? "is-loading" : ""}`}>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.category_name}</option>
                      ))}
                    </select>
                  </div>
                  {catErr && <p className="help is-danger mt-1">{catErr}</p>}
                </div>
              </div>

              <div className="column">
                <div className="field">
                  <label className="label">Usage Limit (Inventory)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="100"
                    value={form.totalInventory}
                    onChange={(e) => setForm((p) => ({ ...p, totalInventory: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* NEW: monthly usage limit */}
            <div className="columns">
              <div className="column is-4">
                <div className="field">
                  <label className="label">Monthly Usage Limit (per user)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0 (unlimited)"
                    value={form.monthlyLimit}
                    onChange={(e) => setForm((p) => ({ ...p, monthlyLimit: e.target.value }))}
                  />
                  <p className="help">Set 0 for unlimited per month.</p>
                </div>
              </div>
            </div>

            <div className="columns">
              <div className="column">
                <div className="field">
                  <label className="label">Start Date</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.startAtLocal}
                    onChange={(e) => setForm((p) => ({ ...p, startAtLocal: e.target.value }))}
                  />
                </div>
              </div>
              <div className="column">
                <div className="field">
                  <label className="label">End Date</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.endAtLocal}
                    onChange={(e) => setForm((p) => ({ ...p, endAtLocal: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="field">
              <label className="label">Images</label>
              <input className="input" type="file" multiple accept="image/*" onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const max = 5 * 1024 * 1024;
                const valids = files.filter((f) => f.type.startsWith("image/") && f.size <= max);
                setImages(valids);
                setPreviews(valids.map((f) => URL.createObjectURL(f)));
              }} />
              {previews.length > 0 && (
                <div className="grid-imgs">
                  {previews.map((url, i) => (
                    <div key={url} className="img-card">
                      <img src={url} alt={`img-${i}`} />
                      <button
                        className="button is-small is-danger is-light"
                        onClick={() => {
                          URL.revokeObjectURL(previews[i]);
                          setImages((a) => a.filter((_, idx) => idx !== i));
                          setPreviews((a) => a.filter((_, idx) => idx !== i));
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="help">Max 5MB per image. You can select multiple files.</p>
            </div>
          </section>
          <footer className="modal-card-foot is-justify-content-flex-end">
            <button className="button" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</button>
            <button className={`button is-primary ${saving ? "is-loading" : ""}`} onClick={onAdd} disabled={saving}>
              Save
            </button>
          </footer>
        </div>
      </div>

      {/* EDIT MODAL */}
      <div className={`modal ${editOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setEditOpen(false)} />
        <div className="modal-card" style={{ maxWidth: 640 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Edit Voucher</p>
            <button className="delete" aria-label="close" onClick={() => setEditOpen(false)} />
          </header>
          <section className="modal-card-body">
            {editError && <div className="notification is-danger is-light">{editError}</div>}
            <div className="field">
              <label className="label">Title</label>
              <input
                className="input"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="label">Price (MYR)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={editForm.price}
                onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="label">End Date</label>
              <input
                className="input"
                type="datetime-local"
                value={editForm.endAtLocal}
                onChange={(e) => setEditForm((p) => ({ ...p, endAtLocal: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="label">Status</label>
              <div className="select is-fullwidth">
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option>Active</option>
                  <option>Draft</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
          </section>
          <footer className="modal-card-foot is-justify-content-flex-end">
            <button className="button" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</button>
            <button className={`button is-primary ${editSaving ? "is-loading" : ""}`} onClick={onUpdate} disabled={editSaving}>
              Update
            </button>
          </footer>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <div className={`modal ${detailOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setDetailOpen(false)} />
        <div className="modal-card" style={{ maxWidth: 860 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Voucher Details</p>
            <button className="delete" aria-label="close" onClick={() => setDetailOpen(false)} />
          </header>
          <section className="modal-card-body">
            {detailLoading && <progress className="progress is-small is-primary" max="100">Loading…</progress>}
            {detailError && <div className="notification is-danger is-light">{detailError}</div>}
            {detail && (
              <>
                <h2 className="title is-5 mb-3">{detail.title}</h2>
                <div className="columns is-multiline">
                  <div className="column is-6">
                    <p><strong>Code:</strong> {detail.code || detail.code_voucher || "-"}</p>
                    <p><strong>Price:</strong> {money(detail.price)}</p>
                    <p><strong>Inventory:</strong> {detail.inventory ?? 0}</p>
                    <p><strong>Status:</strong> {STATUS_LABEL(detail.status)}</p>
                  </div>
                  <div className="column is-6">
                    <p><strong>Start:</strong> {fmtDate(detail.start || detail.voucher_start)}</p>
                    <p><strong>End:</strong> {fmtDate(detail.end || detail.voucher_end)}</p>
                    <p><strong>Vendor ID:</strong> {detail.vendor_id ?? "-"}</p>
                    <p><strong>Category:</strong> {categoryById.get(detail.category_voucher_id) || "-"}</p>
                    <p><strong>Monthly Limit:</strong> {detail.monthly_usage_limit ?? "-"}</p> {/* NEW */}
                  </div>
                </div>

                <div className="mb-4">
                  <strong>Description:</strong>
                  <p className="mt-1">{detail.description || "-"}</p>
                </div>

                <h3 className="subtitle is-6">Images</h3>
                {detail.images?.length ? (
                  <div className="grid-imgs">
                    {detail.images.map((img) => (
                      <a key={img.id} href={imgUrl(img)} target="_blank" rel="noreferrer" className="img-card">
                        <img src={imgUrl(img)} alt={`img-${img.id}`} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <em>No images</em>
                )}
              </>
            )}
          </section>
          <footer className="modal-card-foot is-justify-content-flex-end">
            <button className="button" onClick={() => setDetailOpen(false)}>Close</button>
          </footer>
        </div>
      </div>
    </section>
  );
}

// ---------- Styles ----------
const styles = `
.voucher-page { padding-top: 0; }
/* remove horizontal padding on this page only */
.voucher-page.section { padding-left: 0; padding-right: 0; }

/* full-width container */
.voucher-page .container.is-fluid { max-width: none; width: 100%; }

/* main card flush to edges (optional) */
.voucher-page .vp-shell.card { margin-left: 0; margin-right: 0; }
.vp-shell.card { border: 1px solid #eef1f6; border-radius: 14px; box-shadow: 0 4px 18px rgba(20,20,43,.06); padding: 14px; }
.vp-head { display:flex; align-items:center; justify-content:space-between; padding:6px 8px 12px; }
.vp-head h1 { font-size: 1.2rem; font-weight: 700; }
.vp-actions { display:flex; gap:10px; }
.btn { display:inline-flex; gap:8px; align-items:center; border-radius:10px; padding:8px 12px; border:1px solid #e7eaf0; background:#fff; }
.btn.ghost{ background:#fff; }
.btn.primary{ background:#ff2d87; border-color:#ff2d87; color:#fff; }
.btn.primary:hover{ filter:brightness(.96); }

.vp-stats { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
.stat { border:1px solid #eef1f6; border-radius:12px; padding:12px 14px; background:#fbfcfe; }
.stat-top{ color:#6b7280; font-size:.8rem; display:flex; align-items:center; gap:6px; }
.stat-top.between{ justify-content:space-between; }
.stat-mid{ font-size:1.6rem; font-weight:800; margin-top:6px; }

.icon-ghost{ width:28px; height:28px; border-radius:50%; border:1px solid #e7eaf0; display:inline-flex; align-items:center; justify-content:center; color:#6b7280; background:#fff; }
.icon-ghost:hover{ background:#f7f8fb; }
.icon-ghost.danger{ color:#e05666; border-color:#f3d0d3; }

.vp-toolbar { display:flex; gap:10px; align-items:center; padding:12px 6px; }
.vp-toolbar .search{ position:relative; flex:1; }
.vp-toolbar .search .icon{ position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#6b7280; }
.vp-toolbar .search input{ width:100%; padding:10px 12px 10px 34px; border-radius:12px; border:1px solid #e7eaf0; background:#fff; }
.select-wrap select{ border-radius:12px; border:1px solid #e7eaf0; background:#fff; padding:8px 12px; }
.select-wrap.sm select{ padding:6px 10px; }

.vp-table.card{ margin-top:8px; border:1px solid #eef1f6; border-radius:12px; padding:8px; }
.table thead th{ background:#fbfcfe; color:#6b7280; border-color:#eef1f6; font-weight:600; font-size:.85rem; }
.row-actions{ display:flex; gap:8px; }
.muted{ color:#6b7280; }
.strong{ font-weight:600; }

.chip{ font-weight:700; font-size:.75rem; padding:4px 10px; border-radius:9999px; display:inline-block; }
.chip--active{ color:#0f9b6c; background:#eafaf5; }
.chip--inactive{ color:#d9534f; background:#feeeee; }
.chip--draft{ color:#946200; background:#fff3d6; }

.grid-imgs{ display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:12px; }
.img-card{ border:1px solid #eef1f6; border-radius:10px; padding:8px; background:#fff; display:flex; flex-direction:column; gap:6px; align-items:center; }
.img-card img{ width:100%; height:128px; object-fit:cover; border-radius:6px; }

.vp-pagination{ display:flex; align-items:center; gap:6px; justify-content:flex-end; margin:10px 6px; }
.pg-ctrl, .pg-dot{ border:1px solid #e7eaf0; background:#fff; border-radius:8px; padding:6px 10px; cursor:pointer; }
.pg-dot.is-current{ background:#6d28d9; border-color:#6d28d9; color:#fff; }
.pg-ellipsis{ padding:0 4px; color:#6b7280; }
.pg-ctrl[disabled]{ opacity:.5; cursor:not-allowed; }
`;
