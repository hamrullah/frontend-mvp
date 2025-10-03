// src/pages/VendorList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import {
  IoSearch,
  IoChevronDownOutline,
  IoCalendarOutline,
  IoAdd,
  IoEyeOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
} from "react-icons/io5";

const API_BASE = "https://backend-mvp-nine.vercel.app/api";

// ---------- Helpers ----------
const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-MY", { year: "numeric", month: "short", day: "2-digit" });
};
const statusText = (s) => (Number(s) === 1 ? "Active" : "Suspended");
const statusColor = (s) => (Number(s) === 1 ? "active" : "suspended");

// (optional) sample provinces list
const PROVINCES = ["Johor", "MALAKA", "N.SEMBILAN", "KEDAH", "PERLIS", "PULAU PINANG"];

export default function VendorList() {
  // auth
  const { user } = useSelector((s) => s.auth);
  const role = (user?.role || user?.role_id)?.toString().toUpperCase();
  const isAdmin = role === "ADMIN";

  // LIST state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // pagination & filter & sort
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL | 1 | 0
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // DETAIL state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  // ADD vendor state (new slick UI)
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    twitter: "",
    instagram: "",
    tiktok: "",
  });

  // EDIT vendor state
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [editForm, setEditForm] = useState({
    id: null,
    name: "",
    email: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    twitter: "",
    instagram: "",
    tiktok: "",
    status: 1, // only for admin UI
  });

  // photo picker state (preview only)
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const fileRef = useRef(null);

  const token = (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // ---------- FETCH ----------
  const fetchVendors = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { limit, offset, q: q || undefined, sortBy, sortDir };
      if (status !== "ALL") params.status = status;

      const { data } = await axios.get(`${API_BASE}/vendor/list-vendor`, {
        params,
        headers: { ...authHeader, "Content-Type": "application/json" },
      });

      const list = Array.isArray(data?.vendors) ? data.vendors : [];
      setRows(list);
      setTotal(Number(data?.pagination?.total ?? list.length));
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || "Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset, q, status, sortBy, sortDir]);

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  const next = () => setOffset((o) => Math.min(o + limit, (pages - 1) * limit));
  const prev = () => setOffset((o) => Math.max(0, o - limit));
  const filteredInfo = useMemo(() => ({ page, pages, total }), [page, pages, total]);

  // ---------- DETAIL ----------
  const openDetail = (row) => {
    setDetail(row);
    setDetailOpen(true);
  };

  // ---------- EDIT ----------
  const openEdit = (row) => {
    setEditError("");
    setEditSuccess("");
    setEditForm({
      id: row.id,
      name: row.name || "",
      email: row.email || "",
      address: row.address || "",
      city: row.city || "",
      province: row.province || "",
      postal_code: row.postal_code || "",
      twitter: row.twitter || "",
      instagram: row.instagram || "",
      tiktok: row.tiktok || "",
      status: Number(row.status ?? 1),
    });
    setEditOpen(true);
  };

  const validateEdit = () => {
    if (!editForm.id) return "Invalid vendor id";
    if (!editForm.name.trim()) return "Vendor name is required";
    if (!editForm.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) return "Invalid email format";
    return "";
  };

  const onUpdateVendor = async (e) => {
    e?.preventDefault?.();
    const msg = validateEdit();
    if (msg) {
      setEditError(msg);
      return;
    }
    setEditSaving(true);
    setEditError("");
    setEditSuccess("");

    try {
      // Build payload; server will ignore status if non-admin
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        address: editForm.address || "",
        city: editForm.city || "",
        province: editForm.province || "",
        postal_code: editForm.postal_code || "",
        twitter: editForm.twitter || null,
        instagram: editForm.instagram || null,
        tiktok: editForm.tiktok || null,
        ...(isAdmin ? { status: Number(editForm.status) } : {}), // only admins can send status
      };

      const { data } = await axios.patch(`${API_BASE}/vendor/${editForm.id}`, payload, {
        headers: { ...authHeader, "Content-Type": "application/json" },
      });

      setEditSuccess(data?.message || "Vendor updated");
      await fetchVendors();
      setTimeout(() => {
        setEditOpen(false);
      }, 600);
    } catch (e) {
      console.error(e);
      const serverMsg =
        e?.response?.data?.error ||
        (e?.response?.status === 403 ? "Forbidden: you can only edit your own vendor." : null);
      setEditError(serverMsg || "Failed to update vendor");
    } finally {
      setEditSaving(false);
    }
  };

  // ---------- ADD ----------
  const validateAdd = () => {
    if (!form.name.trim()) return "Vendor name is required";
    if (!form.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Invalid email format";
    return "";
  };

  const resetAdd = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(null);
    setPhotoUrl("");
    setForm({
      name: "",
      email: "",
      address: "",
      city: "",
      province: "",
      postal_code: "",
      twitter: "",
      instagram: "",
      tiktok: "",
    });
    setAddError("");
    setAddSuccess("");
  };

  const onPickPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g)$/i.test(f.type)) {
      setAddError("Only JPG/JPEG/PNG files are allowed");
      return;
    }
    if (f.size > 1024 * 1024) {
      setAddError("Maximum photo size is 1 MB");
      return;
    }
    setAddError("");
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(f);
    setPhotoUrl(URL.createObjectURL(f));
  };

  const onRemovePhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(null);
    setPhotoUrl("");
  };

  const onAddVendor = async (e) => {
    e?.preventDefault?.();
    const msg = validateAdd();
    if (msg) {
      setAddError(msg);
      return;
    }
    setSaving(true);
    setAddError("");
    setAddSuccess("");
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        address: form.address || "",
        city: form.city || "",
        province: form.province || "",
        postal_code: form.postal_code || "",
        twitter: form.twitter || null,
        instagram: form.instagram || null,
        tiktok: form.tiktok || null,
        // image: (await fileToDataUrl(photo)), // <-- enable if backend accepts base64
      };

      const { data } = await axios.post(`${API_BASE}/vendor/add-vendor`, payload, {
        headers: { ...authHeader, "Content-Type": "application/json" },
      });

      setAddSuccess(
        data?.password_note ||
          "Vendor created successfully. Default password: 12345 (please change after first login)."
      );

      await fetchVendors();
      setTimeout(() => {
        setAddOpen(false);
        resetAdd();
      }, 600);
    } catch (e) {
      console.error(e);
      setAddError(e?.response?.data?.error || "Failed to create vendor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="section vendor-page">
      <style>{css}</style>

      <div className="card soft-card">
        <div className="card-content">
          <div className="level is-mobile">
            <div className="level-left">
              <h1 className="title is-5 mb-0">Vendor Management</h1>
            </div>
            <div className="level-right">
              <button className="button is-fuchsia" onClick={() => setAddOpen(true)}>
                <span className="icon"><IoAdd /></span>
                <span>Add Vendor</span>
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar mt-4">
            <div className="toolbar-row">
              <div className="pill">
                <button className="button is-light button-pill" onClick={() => {
                  setQ(""); setStatus("ALL"); setSortBy("created_at"); setSortDir("desc"); setLimit(10); setOffset(0);
                }}>
                  <span>All</span>
                  <span className="icon is-small"><IoChevronDownOutline /></span>
                </button>
              </div>

              <div className="pill">
                <div className="select is-rounded select-pill">
                  <select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
                    <option value="ALL">Status</option>
                    <option value="1">Active</option>
                    <option value="0">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pill">
                <div className="select is-rounded select-pill">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="created_at">Vendor Name / Email</option>
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="city">City</option>
                  </select>
                </div>
              </div>

              <div className="pill">
                <div className="date-wrap">
                  <span className="icon is-left"><IoCalendarOutline /></span>
                  <input type="date" className="input is-rounded input-date" onChange={() => {}} />
                  <span style={{ margin: "0 8px" }}>—</span>
                  <input type="date" className="input is-rounded input-date" onChange={() => {}} />
                </div>
              </div>

              <div className="pill pill-search is-flex-grow-1">
                <div className="control has-icons-left">
                  <input
                    className="input is-rounded"
                    placeholder="Search…"
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setOffset(0); }}
                  />
                  <span className="icon is-left"><IoSearch /></span>
                </div>
              </div>

              <div className="pill">
                <div className="select is-rounded select-pill">
                  <select value={limit} onChange={(e) => { const v = Number(e.target.value) || 10; setLimit(v); setOffset(0); }}>
                    {[10, 20, 50].map((n) => <option key={n} value={n}>{n}/page</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="notification is-danger is-light mt-3">{error}</div>}

          {/* Table */}
          <div className="table-wrap mt-4">
            {loading && <progress className="progress is-small is-primary" max="100">Loading…</progress>}

            <table className="table is-fullwidth is-hoverable vendor-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <label className="checkbox"><input type="checkbox" onChange={() => {}} /></label>
                  </th>
                  <th style={{ width: 110 }}>Actions</th>
                  <th>Vendor Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Join Date</th>
                  <th>Total Products</th>
                  <th>Total Orders</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((v) => (
                  <tr key={v.id}>
                    <td><label className="checkbox"><input type="checkbox" /></label></td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-ghost" title="View" onClick={() => openDetail(v)}><IoEyeOutline /></button>
                        <button className="icon-ghost" title="Edit" onClick={() => openEdit(v)}><IoPencilOutline /></button>
                      </div>
                    </td>
                    <td className="vendor-cell">
                      <div className="avatar" />
                      <div>
                        <div className="name">{v.name}</div>
                        <div className="muted">{v.city || "-"}{v.city && v.province ? ", " : ""}{v.province || "-"}</div>
                      </div>
                    </td>
                    <td className="muted">{v.email || "—"}</td>
                    <td>
                      <span className={`status-badge ${statusColor(v.status)}`}>
                        {Number(v.status) === 1 ? (<><IoCheckmarkCircleOutline /> Active</>) : (<><IoCloseCircleOutline /> Suspended</>)}
                      </span>
                    </td>
                    <td className="muted">{fmtDate(v.created_at)}</td>
                    <td className="muted">-</td>
                    <td className="muted">-</td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="has-text-centered"><p className="has-text-grey">No data</p></td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / pagination */}
          <div className="level mt-3">
            <div className="level-left">
              <p className="is-size-7 has-text-grey">Page {filteredInfo.page} of {filteredInfo.pages}</p>
            </div>
            <div className="level-right">
              <nav className="pagination is-small" role="navigation" aria-label="pagination">
                <button className="pagination-ctrl" onClick={prev} disabled={page <= 1}>‹</button>
                <button className={`page-dot ${page === 1 ? "is-current" : ""}`}>1</button>
                {pages >= 2 && <button className={`page-dot ${page === 2 ? "is-current" : ""}`} onClick={() => setOffset(limit * 1)}>2</button>}
                {pages > 3 && <button className="page-dot" disabled>…</button>}
                {pages >= 3 && <button className="page-dot" onClick={() => setOffset(limit * (pages - 1))}>{pages}</button>}
                <button className="pagination-ctrl" onClick={next} disabled={page >= pages}>›</button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* ADD VENDOR MODAL — redesigned */}
      <div className={`modal ${addOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setAddOpen(false)} />
        <div className="modal-card addv-modal">
          <header className="modal-card-head addv-head">
            <p className="modal-card-title addv-title">Add Vendor</p>
            <button className="delete" aria-label="close" onClick={() => setAddOpen(false)} />
          </header>

          <form onSubmit={onAddVendor}>
            <section className="modal-card-body addv-body">
              {addError && <div className="notification is-danger is-light">{addError}</div>}
              {addSuccess && <div className="notification is-success is-light">{addSuccess}</div>}

              {/* Photo Uploader */}
              <div className="addv-photo">
                <div className="addv-avatar">
                  {photoUrl ? <img src={photoUrl} alt="preview" /> : <span className="addv-avatar-ph" />}
                </div>

                <div className="addv-photo-actions">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={onPickPhoto} />
                  <button type="button" className="button is-light" onClick={() => fileRef.current?.click()}>
                    Upload Photo
                  </button>
                  {photoUrl && (
                    <button type="button" className="button is-light is-danger ml-2" title="Remove" onClick={onRemovePhoto}>
                      <span className="icon"><IoTrashOutline /></span>
                    </button>
                  )}
                  <p className="help mt-1">We only support .JPG, .JPEG, or .PNG files. 1 MB max.</p>
                </div>
              </div>

              {/* Personal Information */}
              <h3 className="addv-section">Personal Information</h3>
              <div className="columns">
                <div className="column">
                  <label className="label addv-label">Vendor Name</label>
                  <input
                    className="input addv-input"
                    placeholder="Your Name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="column">
                  <label className="label addv-label">Email</label>
                  <input
                    className="input addv-input"
                    type="email"
                    placeholder="lorem@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              {/* Address */}
              <h3 className="addv-section">Address</h3>
              <div className="field">
                <label className="label addv-label">Address</label>
                <input
                  className="input addv-input"
                  placeholder="Street Address"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>

              <div className="columns">
                <div className="column">
                  <label className="label addv-label">City</label>
                  <input
                    className="input addv-input"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div className="column">
                  <label className="label addv-label">Province</label>
                  <div className="select is-fullwidth addv-select">
                    <select
                      value={form.province}
                      onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                    >
                      <option value="">Province</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="column">
                  <label className="label addv-label">Postal Code</label>
                  <div className="select is-fullwidth addv-select">
                    {/* screenshot shows a select; we still allow free input by offering presets here */}
                    <select
                      value={form.postal_code}
                      onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
                    >
                      <option value="">Postal Code</option>
                      {["10110","10270","12210","40115","50111","60241"].map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <h3 className="addv-section">Social Media (Optional)</h3>
              <div className="columns">
                <div className="column">
                  <label className="label addv-label">Twitter</label>
                  <input
                    className="input addv-input"
                    placeholder="Twitter URL"
                    value={form.twitter}
                    onChange={(e) => setForm((p) => ({ ...p, twitter: e.target.value }))}
                  />
                </div>
                <div className="column">
                  <label className="label addv-label">Instagram</label>
                  <input
                    className="input addv-input"
                    placeholder="Instagram URL"
                    value={form.instagram}
                    onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))}
                  />
                </div>
                <div className="column">
                  <label className="label addv-label">TikTok</label>
                  <input
                    className="input addv-input"
                    placeholder="TikTok URL"
                    value={form.tiktok}
                    onChange={(e) => setForm((p) => ({ ...p, tiktok: e.target.value }))}
                  />
                </div>
              </div>

              <p className="is-size-7 has-text-grey">
                The vendor account is created with the default password <code>12345</code>. Ask the vendor to change the password after logging in.
              </p>
            </section>

            <footer className="modal-card-foot addv-foot">
              <button type="button" className="button addv-btn-ghost" onClick={() => setAddOpen(false)} disabled={saving}>
                Back
              </button>
              <button type="submit" className={`button addv-btn-primary ${saving ? "is-loading" : ""}`} disabled={saving}>
                Add
              </button>
            </footer>
          </form>
        </div>
      </div>

      {/* EDIT VENDOR MODAL */}
      <div className={`modal ${editOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setEditOpen(false)} />
        <div className="modal-card addv-modal">
          <header className="modal-card-head addv-head">
            <p className="modal-card-title addv-title">Edit Vendor</p>
            <button className="delete" aria-label="close" onClick={() => setEditOpen(false)} />
          </header>

          <form onSubmit={onUpdateVendor}>
            <section className="modal-card-body addv-body">
              {editError && <div className="notification is-danger is-light">{editError}</div>}
              {editSuccess && <div className="notification is-success is-light">{editSuccess}</div>}

              <h3 className="addv-section">Personal Information</h3>
              <div className="columns">
                <div className="column">
                  <label className="label addv-label">Vendor Name</label>
                  <input
                    className="input addv-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Vendor Name"
                  />
                </div>
                <div className="column">
                  <label className="label addv-label">Email</label>
                  <input
                    className="input addv-input"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="vendor@example.com"
                  />
                </div>
              </div>

              <h3 className="addv-section">Address</h3>
              <div className="field">
                <label className="label addv-label">Address</label>
                <input
                  className="input addv-input"
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Street Address"
                />
              </div>

              <div className="columns">
                <div className="column">
                  <label className="label addv-label">City</label>
                  <input
                    className="input addv-input"
                    value={editForm.city}
                    onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div className="column">
                  <label className="label addv-label">Province</label>
                  <div className="select is-fullwidth addv-select">
                    <select
                      value={editForm.province}
                      onChange={(e) => setEditForm((p) => ({ ...p, province: e.target.value }))}
                    >
                      <option value="">Province</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="column">
                  <label className="label addv-label">Postal Code</label>
                  <input
                    className="input addv-input"
                    value={editForm.postal_code}
                    onChange={(e) => setEditForm((p) => ({ ...p, postal_code: e.target.value }))}
                    placeholder="Postal Code"
                  />
                </div>
              </div>

              <h3 className="addv-section">Social Media (Optional)</h3>
              <div className="columns">
                <div className="column">
                  <label className="label addv-label">Twitter</label>
                  <input
                    className="input addv-input"
                    value={editForm.twitter}
                    onChange={(e) => setEditForm((p) => ({ ...p, twitter: e.target.value }))}
                    placeholder="Twitter URL"
                  />
                </div>
                <div className="column">
                  <label className="label addv-label">Instagram</label>
                  <input
                    className="input addv-input"
                    value={editForm.instagram}
                    onChange={(e) => setEditForm((p) => ({ ...p, instagram: e.target.value }))}
                    placeholder="Instagram URL"
                  />
                </div>
                <div className="column">
                  <label className="label addv-label">TikTok</label>
                  <input
                    className="input addv-input"
                    value={editForm.tiktok}
                    onChange={(e) => setEditForm((p) => ({ ...p, tiktok: e.target.value }))}
                    placeholder="TikTok URL"
                  />
                </div>
              </div>

              {isAdmin && (
                <>
                  <h3 className="addv-section">Admin Controls</h3>
                  <div className="field">
                    <label className="label addv-label">Status</label>
                    <div className="select is-fullwidth addv-select">
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((p) => ({ ...p, status: Number(e.target.value) }))}
                      >
                        <option value={1}>Active</option>
                        <option value={0}>Suspended</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </section>

            <footer className="modal-card-foot addv-foot">
              <button type="button" className="button addv-btn-ghost" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Cancel
              </button>
              <button type="submit" className={`button addv-btn-primary ${editSaving ? "is-loading" : ""}`} disabled={editSaving}>
                Update
              </button>
            </footer>
          </form>
        </div>
      </div>

      {/* VENDOR DETAIL MODAL */}
      <div className={`modal ${detailOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setDetailOpen(false)} />
        <div className="modal-card" style={{ maxWidth: 720 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Vendor Detail</p>
            <button className="delete" aria-label="close" onClick={() => setDetailOpen(false)} />
          </header>
          <section className="modal-card-body">
            {detail && (
              <>
                <div className="columns">
                  <div className="column is-3"><div className="avatar lg" /></div>
                  <div className="column is-9">
                    <h2 className="title is-5 mb-2">{detail.name}</h2>
                    <p><strong>Email:</strong> {detail.email || "-"}</p>
                    <p><strong>Vendor Code:</strong> {detail.code_vendor || "-"}</p>
                    <p><strong>Address:</strong> {detail.address || "-"}</p>
                    <p><strong>City/Province:</strong> {(detail.city || "-")}{detail.city && detail.province ? ", " : " "}{detail.province || "-"}</p>
                    <p><strong>Postal Code:</strong> {detail.postal_code || "-"}</p>
                    <p><strong>Status:</strong> {statusText(detail.status)}</p>
                    <p className="is-size-7 has-text-grey mt-2">Created: {fmtDate(detail.created_at)} · Updated: {fmtDate(detail.updated_at)}</p>
                  </div>
                </div>
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

/* ---------- Styles (inline) ---------- */
const css = `
.vendor-page { padding-top: 3; }
/* remove Bulma's horizontal padding on this page only */
.vendor-page.section { padding-left: 0; padding-right: 0; }

/* ensure the container is truly full-width */
.vendor-page .container.is-fluid { max-width: none; width: 100%; }

/* optionally keep the main card flush with the edges */
.vendor-page .vp-shell.card { margin-left: 0; margin-right: 0; }
.vendor-page .soft-card { border: 1px solid #eceff4; border-radius: 14px; box-shadow: 0 4px 20px rgba(20,20,43,.06); }
.toolbar-row { display:flex; flex-wrap:wrap; gap:.6rem; align-items:center; }
.pill { display:flex; align-items:center; }
.button-pill, .select-pill select, .toolbar .input { border-radius: 9999px !important; background:#f7f8fb; border-color:#e9edf2; }
.pill-search { min-width: 260px; }
.date-wrap { display:flex; align-items:center; gap:.4rem; }
.input-date { width:150px; }
.table-wrap { border:1px solid #eef1f6; border-radius:12px; overflow:hidden; }
.vendor-table thead th { background:#fbfcfe; color:#6b7280; font-weight:600; font-size:.85rem; border-color:#eef1f6; }
.vendor-table td { vertical-align: middle; }
.vendor-cell { display:flex; align-items:center; gap:12px; }
.vendor-cell .name { font-weight:600; }
.muted { color:#6b7280; }
.avatar { width:28px; height:28px; border-radius:50%; background:#e8ecf3; }
.avatar.lg { width:128px; height:128px; border-radius:12px; background:#e8ecf3; }
.action-buttons { display:flex; gap:8px; }
.icon-ghost { width:28px; height:28px; border-radius:50%; border:1px solid #e7eaf0; background:#fff; display:inline-flex; align-items:center; justify-content:center; color:#6b7280; }
.icon-ghost:hover { background:#f7f8fb; }
.icon-ghost.danger { color:#e05666; border-color:#f3d0d3; }
.status-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:9999px; font-weight:600; font-size:.8rem; }
.status-badge.active { color:#0f9b6c; background:#eafaf5; }
.status-badge.suspended { color:#d9534f; background:#feeeee; }
.pagination-ctrl, .page-dot { border:1px solid #e7eaf0; background:#fff; border-radius:8px; padding:6px 10px; margin-left:6px; }
.page-dot.is-current { background:#6d28d9; border-color:#6d28d9; color:#fff; }
.pagination-ctrl[disabled], .page-dot[disabled] { opacity:.5; cursor:not-allowed; }

/* ---- Add / Edit Vendor Modal styles ---- */
.addv-modal { max-width: 760px; border-radius: 24px; overflow: hidden; }
.addv-head { border-bottom: none; padding: 18px 22px 0 22px; }
.addv-title { font-weight: 700; font-size: 1.15rem; }
.addv-body { padding: 12px 22px 0 22px; }
.addv-foot { border-top: none; padding: 16px 22px 22px; display:flex; justify-content:flex-end; gap:10px; }

.addv-photo { display:flex; align-items:center; gap:16px; margin: 6px 0 18px; }
.addv-avatar { width:56px; height:56px; border-radius:50%; background:#f3f5f9; overflow:hidden; display:flex; align-items:center; justify-content:center; }
.addv-avatar img { width:100%; height:100%; object-fit:cover; }
.addv-avatar-ph { width:26px; height:26px; border-radius:50%; background:#dfe6f2; display:inline-block; }
.addv-photo-actions .button { border-radius:10px; }
.addv-photo .help { color:#6b7280; }

.addv-section { margin: 18px 0 12px; font-weight:700; font-size:.95rem; }
.addv-label { font-weight:600; color:#374151; }
.addv-input { border-radius:12px; background:#fff; }
.addv-select select { border-radius:12px; background:#fff; }

.addv-btn-ghost { border-radius:12px; background:#f6f7fb; border:1px solid #e7eaf0; }
.addv-btn-primary { border-radius:12px; background:#2c2d33; color:#fff; border-color:#2c2d33; }
.addv-btn-primary:hover { filter: brightness(.95); }

.button.is-fuchsia { background:#ff2d87; border-color:#ff2d87; color:#fff; }
.button.is-fuchsia:hover { filter:brightness(.96); }
`;
