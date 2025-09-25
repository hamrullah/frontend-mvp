// src/pages/VoucherList.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:3000/api"; // ganti ke "/api" jika pakai proxy

// ---------- Helpers ----------
const money = (v) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(
    Number(v || 0)
  );

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toIso = (localStr) => new Date(localStr).toISOString();

const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const statusLabel = (s) =>
  ({ 1: "ACTIVE", 0: "INACTIVE", 2: "DRAFT" }[Number(s)] || String(s));

const imgUrl = (img) =>
  img?.url || (img?.file ? `http://localhost:3000${img.file}` : "");

// =====================================================

export default function VoucherList() {
  // LIST state
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // pagination & filter
  const [limit, setLimit] = useState(5);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");

  // ADD state
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
    vendorId: "",
    categoryId: "",
  });
  const [images, setImages] = useState([]);     // File[]
  const [previews, setPreviews] = useState([]); // object URLs

  // EDIT state
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    price: "",
    endAtLocal: "",
    status: "DRAFT", // ACTIVE | DRAFT | INACTIVE
  });

  // DETAIL state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState(null);

  // VENDOR dropdown state
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsErr, setVendorsErr] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");

  // auth header
  const token = localStorage.getItem("token");
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // ---------- LIST ----------
  const fetchVouchers = async () => {
    setLoading(true);
    setError("");
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
      setError(e?.response?.data?.error || "Gagal mengambil data voucher");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((v) =>
      `${v.title} ${statusLabel(v.status)}`.toLowerCase().includes(q)
    );
  }, [list, query]);

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  const next = () => setOffset((o) => Math.min(o + limit, (pages - 1) * limit));
  const prev = () => setOffset((o) => Math.max(0, o - limit));

  // ---------- VENDORS (dropdown) ----------
  async function loadVendors(q = "") {
    setVendorsLoading(true);
    setVendorsErr("");
    try {
      const { data } = await axios.get(`${API_BASE}/vendor/list-vendor`, {
        params: {
          limit: 50,
          offset: 0,
          q,
          status: 1,
          sortBy: "name",
          sortDir: "asc",
        },
        headers: { ...authHeader, "Content-Type": "application/json" },
      });
      setVendors(Array.isArray(data?.vendors) ? data.vendors : []);
    } catch (e) {
      console.error(e);
      setVendorsErr(e?.response?.data?.error || "Gagal memuat vendor");
      setVendors([]);
    } finally {
      setVendorsLoading(false);
    }
  }

  // buka modal Add => load vendor
  useEffect(() => {
    if (addOpen) loadVendors("");
  }, [addOpen]);

  // debounce pencarian vendor saat add modal aktif
  useEffect(() => {
    if (!addOpen) return;
    const t = setTimeout(() => loadVendors(vendorSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [vendorSearch, addOpen]);

  // ---------- ADD ----------
  const validateForm = () => {
    if (!form.title.trim()) return "Judul wajib diisi";
    if (!form.vendorId) return "Vendor wajib diisi";
    if (!form.categoryId) return "Kategori wajib diisi";
    const priceNum = Number(form.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return "Harga tidak valid";
    if (!form.startAtLocal || !form.endAtLocal)
      return "Tanggal mulai & akhir wajib diisi";
    const start = new Date(form.startAtLocal);
    const end = new Date(form.endAtLocal);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return "Format tanggal tidak valid";
    if (end <= start) return "Tanggal akhir harus lebih besar dari tanggal mulai";
    const inv = Number(form.totalInventory);
    if (!Number.isInteger(inv) || inv < 0)
      return "Total inventory harus bilangan bulat ≥ 0";
    return "";
  };

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 5 * 1024 * 1024;
    const valid = files.filter(
      (f) => f.type.startsWith("image/") && f.size <= maxSize
    );
    setImages(valid);
    setPreviews(valid.map((f) => URL.createObjectURL(f)));
  };

  const removeImageAt = (idx) => {
    URL.revokeObjectURL(previews[idx]);
    setImages((arr) => arr.filter((_, i) => i !== idx));
    setPreviews((arr) => arr.filter((_, i) => i !== idx));
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
      vendorId: "",
      categoryId: "",
    });
    setVendorSearch("");
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
      images.forEach((file) => fd.append("images", file));

      await axios.post(`${API_BASE}/voucher/add-voucher`, fd, {
        headers: { ...authHeader }, // biar browser set boundary otomatis
      });

      setAddOpen(false);
      resetAddForm();
      setOffset(0);
      fetchVouchers();
    } catch (e) {
      console.error(e);
      setAddError(e?.response?.data?.error || "Gagal menambahkan voucher");
    } finally {
      setSaving(false);
    }
  };

  // ---------- EDIT ----------
  const openEdit = (v) => {
    setEditError("");
    setEditForm({
      id: v.id,
      title: v.title || "",
      price: String(v.price ?? ""),
      endAtLocal: toLocalInput(v.end),
      status: statusLabel(v.status),
    });
    setEditOpen(true);
  };

  const validateEdit = () => {
    if (!editForm.id) return "Data voucher tidak valid";
    if (!editForm.title.trim()) return "Judul wajib diisi";
    const priceNum = Number(editForm.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return "Harga tidak valid";
    if (!editForm.endAtLocal) return "Tanggal akhir wajib diisi";
    const end = new Date(editForm.endAtLocal);
    if (Number.isNaN(end.getTime())) return "Format tanggal tidak valid";
    if (!["ACTIVE", "DRAFT", "INACTIVE"].includes(editForm.status))
      return "Status tidak valid";
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
        status: editForm.status,
      };
      await axios.put(`${API_BASE}/voucher/${editForm.id}`, payload, {
        headers: { ...authHeader, "Content-Type": "application/json" },
      });
      setEditOpen(false);
      fetchVouchers();
    } catch (e) {
      console.error(e);
      setEditError(e?.response?.data?.error || "Gagal mengupdate voucher");
    } finally {
      setEditSaving(false);
    }
  };

  // ---------- DETAIL ----------
  const fetchVoucherDetail = async (id) => {
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    try {
      const { data } = await axios.get(`${API_BASE}/voucher/${id}`, {
        headers: { ...authHeader },
      });
      setDetail(data?.voucher || null);
      setDetailOpen(true);
    } catch (e) {
      console.error(e);
      setDetailError(e?.response?.data?.error || "Gagal memuat detail voucher");
      setDetailOpen(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (v) => fetchVoucherDetail(v.id);

  // =====================================================

  return (
    <section className="section">
      <div className="container">
        {/* Header + Toolbar */}
        <nav className="level">
          <div className="level-left">
            <div>
              <h1 className="title">Vouchers</h1>
              <p className="subtitle is-6">List voucher dari API</p>
            </div>
          </div>
          <div className="level-right">
            <div className="field has-addons">
              <p className="control is-expanded">
                <input
                  className="input"
                  type="text"
                  placeholder="Cari judul/status…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </p>
              <p className="control">
                <div className="select">
                  <select
                    value={limit}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 5;
                      setLimit(v);
                      setOffset(0);
                    }}
                  >
                    {[5, 10, 20].map((n) => (
                      <option key={n} value={n}>
                        {n}/page
                      </option>
                    ))}
                  </select>
                </div>
              </p>
              <p className="control">
                <button
                  className="button is-primary"
                  onClick={() => setAddOpen(true)}
                >
                  + Add Voucher
                </button>
              </p>
            </div>
          </div>
        </nav>

        {error && <div className="notification is-danger is-light">{error}</div>}
        {loading && (
          <progress className="progress is-small is-primary" max="100">
            Loading…
          </progress>
        )}

        <div className="card">
          <div className="card-content">
            <div className="table-container">
              <table className="table is-fullwidth is-striped is-hoverable">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>No</th>
                    <th>Title</th>
                    <th>Price</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Inventory</th>
                    <th>Status</th>
                    <th style={{ width: 170 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length ? (
                    filtered.map((v, idx) => (
                      <tr key={v.id}>
                        <td>{offset + idx + 1}</td>
                        <td className="has-text-weight-medium">{v.title}</td>
                        <td>{money(v.price)}</td>
                        <td>{fmtDate(v.start)}</td>
                        <td>{fmtDate(v.end)}</td>
                        <td>{v.inventory ?? 0}</td>
                        <td>
                          <span className="tag is-info is-light">
                            {statusLabel(v.status)}
                          </span>
                        </td>
                        <td>
                          <div className="buttons are-small">
                            <button
                              className="button is-link is-light"
                              onClick={() => openDetail(v)}
                            >
                              Detail
                            </button>
                            <button
                              className="button is-info is-light"
                              onClick={() => openEdit(v)}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="has-text-centered">
                        <p className="has-text-grey">Tidak ada data</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="level">
              <div className="level-left">
                <p className="has-text-grey is-size-7">
                  Menampilkan {filtered.length} dari {total} data
                </p>
              </div>
              <div className="level-right">
                <div className="buttons">
                  <button className="button" onClick={prev} disabled={page <= 1}>
                    Prev
                  </button>
                  <span className="button is-static">
                    Page {page} / {pages}
                  </span>
                  <button className="button" onClick={next} disabled={page >= pages}>
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADD VOUCHER MODAL */}
      <div className={`modal ${addOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setAddOpen(false)} />
        <div className="modal-card" style={{ maxWidth: 720 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Add Voucher</p>
            <button
              className="delete"
              aria-label="close"
              onClick={() => setAddOpen(false)}
            />
          </header>
          <section className="modal-card-body">
            {addError && (
              <div className="notification is-danger is-light" role="alert">
                {addError}
              </div>
            )}

            <div className="columns">
              <div className="column">
                <div className="field">
                  <label className="label">Title</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      placeholder="Voucher Diskon 50%"
                      value={form.title}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, title: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="column">
                <div className="field">
                  <label className="label">Price (IDR)</label>
                  <div className="control">
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="100"
                      placeholder="100000"
                      value={form.price}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, price: e.target.value }))
                      }
                    />
                  </div>
                  <p className="help">Dikirim sebagai string 2 desimal, mis: 100000.00</p>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="label">Description</label>
              <div className="control">
                <textarea
                  className="textarea"
                  placeholder="Deskripsi voucher"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="columns">
              {/* VENDOR (dropdown + search) */}
              <div className="column">
                <div className="field">
                  <label className="label">Vendor</label>
                  
                  <div className="control">
                    <div className={`select is-fullwidth ${vendorsLoading ? "is-loading" : ""}`}>
                      <select
                        value={form.vendorId}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, vendorId: e.target.value }))
                        }
                      >
                        <option value="">-- Pilih Vendor --</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                            {v.city ? ` · ${v.city}` : ""}
                            {v.code_vendor ? ` · ${v.code_vendor}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {vendorsErr && <p className="help is-danger mt-1">{vendorsErr}</p>}
                </div>
              </div>

              <div className="column">
                <div className="field">
                  <label className="label">Category ID</label>
                  <div className="control">
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={form.categoryId}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, categoryId: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="column">
                <div className="field">
                  <label className="label">Total Inventory</label>
                  <div className="control">
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="100"
                      value={form.totalInventory}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          totalInventory: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="columns">
              <div className="column">
                <div className="field">
                  <label className="label">Start At</label>
                  <div className="control">
                    <input
                      className="input"
                      type="datetime-local"
                      value={form.startAtLocal}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, startAtLocal: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="column">
                <div className="field">
                  <label className="label">End At</label>
                  <div className="control">
                    <input
                      className="input"
                      type="datetime-local"
                      value={form.endAtLocal}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, endAtLocal: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Uploader multi image + preview */}
            <div className="field">
              <label className="label">Images</label>
              <div className="control">
                <input
                  className="input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onPickFiles}
                />
              </div>
              {previews.length > 0 && (
                <div
                  className="mt-3"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 10,
                  }}
                >
                  {previews.map((url, i) => (
                    <div key={url} className="box p-2 has-text-centered">
                      <figure className="image is-96x96" style={{ margin: "0 auto" }}>
                        <img src={url} alt={`img-${i}`} style={{ objectFit: "cover" }} />
                      </figure>
                      <button
                        className="button is-small is-danger is-light mt-2"
                        onClick={() => removeImageAt(i)}
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="help">Maks 5MB per gambar. Bisa pilih beberapa file sekaligus.</p>
            </div>
          </section>
          <footer className="modal-card-foot is-justify-content-flex-end">
            <button className="button" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button
              className={`button is-primary ${saving ? "is-loading" : ""}`}
              onClick={onAdd}
              disabled={saving}
            >
              Save
            </button>
          </footer>
        </div>
      </div>

      {/* EDIT VOUCHER MODAL */}
      <div className={`modal ${editOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setEditOpen(false)} />
        <div className="modal-card" style={{ maxWidth: 640 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Edit Voucher</p>
            <button
              className="delete"
              aria-label="close"
              onClick={() => setEditOpen(false)}
            />
          </header>
          <section className="modal-card-body">
            {editError && (
              <div className="notification is-danger is-light" role="alert">
                {editError}
              </div>
            )}
            <div className="field">
              <label className="label">Title</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Price (IDR)</label>
              <div className="control">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="100"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, price: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="field">
              <label className="label">End At</label>
              <div className="control">
                <input
                  className="input"
                  type="datetime-local"
                  value={editForm.endAtLocal}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, endAtLocal: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Status</label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, status: e.target.value }))
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
            </div>
          </section>
          <footer className="modal-card-foot is-justify-content-flex-end">
            <button className="button" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancel
            </button>
            <button
              className={`button is-primary ${editSaving ? "is-loading" : ""}`}
              onClick={onUpdate}
              disabled={editSaving}
            >
              Update
            </button>
          </footer>
        </div>
      </div>

      {/* DETAIL VOUCHER MODAL */}
      <div className={`modal ${detailOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setDetailOpen(false)} />
        <div className="modal-card" style={{ maxWidth: 820 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Voucher Detail</p>
            <button className="delete" aria-label="close" onClick={() => setDetailOpen(false)} />
          </header>

          <section className="modal-card-body">
            {detailLoading && (
              <progress className="progress is-small is-primary" max="100">Loading…</progress>
            )}

            {detailError && (
              <div className="notification is-danger is-light">{detailError}</div>
            )}

            {detail && (
              <>
                <h2 className="title is-5 mb-3">{detail.title}</h2>
                <div className="columns is-multiline">
                  <div className="column is-6">
                    <p><strong>Kode:</strong> {detail.code || "-"}</p>
                    <p><strong>Harga:</strong> {money(detail.price)}</p>
                    <p><strong>Inventory:</strong> {detail.inventory ?? 0}</p>
                    <p><strong>Status:</strong> {statusLabel(detail.status)}</p>
                  </div>
                  <div className="column is-6">
                    <p><strong>Start:</strong> {fmtDate(detail.start)}</p>
                    <p><strong>End:</strong> {fmtDate(detail.end)}</p>
                    <p><strong>Vendor ID:</strong> {detail.vendor_id ?? "-"}</p>
                    <p><strong>Kategori ID:</strong> {detail.category_voucher_id ?? "-"}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <strong>Deskripsi:</strong>
                  <p className="mt-1">{detail.description || "-"}</p>
                </div>

                <h3 className="subtitle is-6">Images</h3>
                {detail.images?.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {detail.images.map((img) => (
                      <a
                        key={img.id}
                        href={imgUrl(img)}
                        target="_blank"
                        rel="noreferrer"
                        className="box p-2"
                      >
                        <figure className="image is-128x128" style={{ margin: 0 }}>
                          <img
                            src={imgUrl(img)}
                            alt={`img-${img.id}`}
                            style={{
                              width: "100%",
                              height: "128px",
                              objectFit: "cover",
                              borderRadius: 6,
                            }}
                          />
                        </figure>
                      </a>
                    ))}
                  </div>
                ) : (
                  <em>Tidak ada gambar</em>
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
