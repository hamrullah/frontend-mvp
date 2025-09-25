import React, { useEffect, useMemo, useState } from "react";
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
  return d.toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};
const statusText = (s) => (Number(s) === 1 ? "Active" : "Suspended");
const statusColor = (s) => (Number(s) === 1 ? "active" : "suspended");

export default function VendorList() {
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

  // ADD vendor state
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

  const token = localStorage.getItem("token");
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // ---------- FETCH ----------
  const fetchVendors = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        limit,
        offset,
        q: q || undefined,
        sortBy,
        sortDir,
      };
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
      setError(e?.response?.data?.error || "Gagal mengambil data vendor");
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

  // ---------- ADD ----------
  const validateAdd = () => {
    if (!form.name.trim()) return "Nama wajib diisi";
    if (!form.email.trim()) return "Email wajib diisi";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return "Format email tidak valid";
    return "";
  };

  const resetAdd = () => {
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
      };

      const { data } = await axios.post(`${API_BASE}/vendor/add-vendor`, payload, {
        headers: { ...authHeader, "Content-Type": "application/json" },
      });

      setAddSuccess(
        data?.password_note ||
          "Vendor berhasil dibuat. Password default: 12345 (harap ubah setelah login)."
      );

      await fetchVendors();
      setTimeout(() => {
        setAddOpen(false);
        resetAdd();
      }, 600);
    } catch (e) {
      console.error(e);
      setAddError(e?.response?.data?.error || "Gagal membuat vendor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="section vendor-page">
      {/* inline style untuk mempercantik (boleh pindah ke file CSS-mu) */}
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

          {/* Toolbar filters */}
          <div className="toolbar mt-4">
            <div className="toolbar-row">
              <div className="pill">
                <button className="button is-light button-pill">
                  <span>All</span>
                  <span className="icon is-small"><IoChevronDownOutline /></span>
                </button>
              </div>

              <div className="pill">
                <div className="select is-rounded select-pill">
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setOffset(0);
                    }}
                  >
                    <option value="ALL">Status</option>
                    <option value="1">Active</option>
                    <option value="0">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pill">
                <div className="select is-rounded select-pill">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
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
                  <input
                    type="date"
                    className="input is-rounded input-date"
                    onChange={() => {}}
                  />
                  <span style={{ margin: "0 8px" }}>—</span>
                  <input
                    type="date"
                    className="input is-rounded input-date"
                    onChange={() => {}}
                  />
                </div>
              </div>

              <div className="pill pill-search is-flex-grow-1">
                <div className="control has-icons-left">
                  <input
                    className="input is-rounded"
                    placeholder="Search…"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setOffset(0);
                    }}
                  />
                  <span className="icon is-left"><IoSearch /></span>
                </div>
              </div>

              <div className="pill">
                <div className="select is-rounded select-pill">
                  <select
                    value={limit}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 10;
                      setLimit(v);
                      setOffset(0);
                    }}
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}/page</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="notification is-danger is-light mt-3">{error}</div>}

          {/* Table */}
          <div className="table-wrap mt-4">
            {loading && (
              <progress className="progress is-small is-primary" max="100">
                Loading…
              </progress>
            )}

            <table className="table is-fullwidth is-hoverable vendor-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <label className="checkbox">
                      <input type="checkbox" onChange={() => {}} />
                    </label>
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
                {rows.length ? (
                  rows.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <label className="checkbox"><input type="checkbox" /></label>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="icon-ghost" title="View" onClick={() => openDetail(v)}>
                            <IoEyeOutline />
                          </button>
                          <button className="icon-ghost" title="Edit" onClick={() => openDetail(v)}>
                            <IoPencilOutline />
                          </button>
                          <button className="icon-ghost danger" title="Delete" onClick={() => alert("Confirm delete?")}>
                            <IoTrashOutline />
                          </button>
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
                          {Number(v.status) === 1 ? (
                            <>
                              <IoCheckmarkCircleOutline /> Active
                            </>
                          ) : (
                            <>
                              <IoCloseCircleOutline /> Suspended
                            </>
                          )}
                        </span>
                      </td>
                      <td className="muted">{fmtDate(v.created_at)}</td>
                      <td className="muted">-</td>
                      <td className="muted">-</td>
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

          {/* Footer / pagination */}
          <div className="level mt-3">
            <div className="level-left">
              <p className="is-size-7 has-text-grey">
                Page {filteredInfo.page} of {filteredInfo.pages}
              </p>
            </div>
            <div className="level-right">
              <nav className="pagination is-small" role="navigation" aria-label="pagination">
                <button className="pagination-ctrl" onClick={prev} disabled={page <= 1}>
                  ‹
                </button>
                <button className={`page-dot ${page === 1 ? "is-current" : ""}`}>1</button>
                <button className={`page-dot ${page === 2 ? "is-current" : ""}`} onClick={() => setOffset(limit * 1)}>
                  2
                </button>
                <button className="page-dot" disabled>…</button>
                <button className="page-dot" onClick={() => setOffset(limit * (pages - 1))}>
                  {pages}
                </button>
                <button className="pagination-ctrl" onClick={next} disabled={page >= pages}>
                  ›
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* ADD VENDOR MODAL */}
      <div className={`modal ${addOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setAddOpen(false)} />
        <div className="modal-card" style={{ maxWidth: 760 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Create Vendor</p>
            <button className="delete" aria-label="close" onClick={() => setAddOpen(false)} />
          </header>

          <form onSubmit={onAddVendor}>
            <section className="modal-card-body">
              {addError && <div className="notification is-danger is-light">{addError}</div>}
              {addSuccess && <div className="notification is-success is-light">{addSuccess}</div>}

              <div className="columns">
                <div className="column">
                  <div className="field">
                    <label className="label">Name</label>
                    <div className="control">
                      <input
                        className="input"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="PT Contoh Sejahtera"
                      />
                    </div>
                  </div>
                </div>
                <div className="column">
                  <div className="field">
                    <label className="label">Email</label>
                    <div className="control">
                      <input
                        className="input"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="vendor@example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="label">Address</label>
                <div className="control">
                  <input
                    className="input"
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Jl. Mawar No. 1"
                  />
                </div>
              </div>

              <div className="columns">
                <div className="column">
                  <div className="field">
                    <label className="label">City</label>
                    <div className="control">
                      <input
                        className="input"
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        placeholder="Jakarta"
                      />
                    </div>
                  </div>
                </div>
                <div className="column">
                  <div className="field">
                    <label className="label">Province</label>
                    <div className="control">
                      <input
                        className="input"
                        value={form.province}
                        onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                        placeholder="DKI Jakarta"
                      />
                    </div>
                  </div>
                </div>
                <div className="column">
                  <div className="field">
                    <label className="label">Postal Code</label>
                    <div className="control">
                      <input
                        className="input"
                        value={form.postal_code}
                        onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="columns">
                <div className="column">
                  <div className="field">
                    <label className="label">Twitter</label>
                    <div className="control">
                      <input
                        className="input"
                        value={form.twitter}
                        onChange={(e) => setForm((p) => ({ ...p, twitter: e.target.value }))}
                        placeholder="@akun_twitter"
                      />
                    </div>
                  </div>
                </div>
                <div className="column">
                  <div className="field">
                    <label className="label">Instagram</label>
                    <div className="control">
                      <input
                        className="input"
                        value={form.instagram}
                        onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))}
                        placeholder="@akun.ig"
                      />
                    </div>
                  </div>
                </div>
                <div className="column">
                  <div className="field">
                    <label className="label">TikTok</label>
                    <div className="control">
                      <input
                        className="input"
                        value={form.tiktok}
                        onChange={(e) => setForm((p) => ({ ...p, tiktok: e.target.value }))}
                        placeholder="@akun_tiktok"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <p className="is-size-7 has-text-grey">
                Akun vendor dibuat dengan password default <code>12345</code>. Minta vendor untuk
                mengganti password setelah login.
              </p>
            </section>

            <footer className="modal-card-foot is-justify-content-flex-end">
              <button type="button" className="button" onClick={() => setAddOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className={`button is-primary ${saving ? "is-loading" : ""}`} disabled={saving}>
                Create
              </button>
            </footer>
          </form>
        </div>
      </div>

      {/* DETAIL VENDOR MODAL */}
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
                  <div className="column is-3">
                    <div className="avatar lg" />
                  </div>
                  <div className="column is-9">
                    <h2 className="title is-5 mb-2">{detail.name}</h2>
                    <p><strong>Email:</strong> {detail.email || "-"}</p>
                    <p><strong>Kode Vendor:</strong> {detail.code_vendor || "-"}</p>
                    <p><strong>Alamat:</strong> {detail.address || "-"}</p>
                    <p>
                      <strong>Kota/Prov:</strong> {(detail.city || "-")}
                      {detail.city && detail.province ? ", " : " "}
                      {detail.province || "-"}
                    </p>
                    <p><strong>Kode Pos:</strong> {detail.postal_code || "-"}</p>
                    <p><strong>Status:</strong> {statusText(detail.status)}</p>
                    <p className="is-size-7 has-text-grey mt-2">
                      Dibuat: {fmtDate(detail.created_at)} · Update: {fmtDate(detail.updated_at)}
                    </p>
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

const css = `
.vendor-page .soft-card {
  border: 1px solid #eceff4;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(20, 20, 43, 0.06);
}

.toolbar-row {
  display: flex; flex-wrap: wrap; gap: .6rem; align-items: center;
}
.pill { display: flex; align-items: center; }
.button-pill, .select-pill select, .toolbar .input {
  border-radius: 9999px !important;
  background: #f7f8fb;
  border-color: #e9edf2;
}
.pill-search { min-width: 260px; }

.date-wrap { display:flex; align-items:center; gap:.4rem; }
.input-date { width: 150px; }

.button.is-fuchsia {
  background: #ff2d87; border-color: #ff2d87; color: #fff;
}
.button.is-fuchsia:hover { filter: brightness(0.96); }

.table-wrap { border: 1px solid #eef1f6; border-radius: 12px; overflow: hidden; }
.vendor-table thead th {
  background: #fbfcfe;
  color: #6b7280; font-weight: 600; font-size: .85rem;
  border-color: #eef1f6;
}
.vendor-table td { vertical-align: middle; }

.vendor-cell { display: flex; align-items: center; gap: 12px; }
.vendor-cell .name { font-weight: 600; }
.muted { color: #6b7280; }

.avatar { width: 28px; height: 28px; border-radius: 50%; background: #e8ecf3; }
.avatar.lg { width: 128px; height: 128px; border-radius: 12px; background: #e8ecf3; }

.action-buttons { display: flex; gap: 8px; }
.icon-ghost {
  width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid #e7eaf0; background: #fff; display: inline-flex; align-items:center; justify-content:center;
  color: #6b7280;
}
.icon-ghost:hover { background: #f7f8fb; }
.icon-ghost.danger { color: #e05666; border-color: #f3d0d3; }

.status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: .8rem;
}
.status-badge.active { color: #0f9b6c; background: #eafaf5; }
.status-badge.suspended { color: #d9534f; background: #feeeee; }

.pagination-ctrl, .page-dot {
  border: 1px solid #e7eaf0; background:#fff; border-radius: 8px; padding: 6px 10px; margin-left: 6px;
}
.page-dot.is-current { background: #6d28d9; border-color:#6d28d9; color:#fff; }
.pagination-ctrl[disabled], .page-dot[disabled] { opacity:.5; cursor:not-allowed; }
`;
