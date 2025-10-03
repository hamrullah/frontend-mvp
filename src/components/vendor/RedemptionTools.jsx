// src/pages/RedemptionTools.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  IoSearch,
  IoRefresh,
  IoFunnelOutline,
  IoOptionsOutline,
  IoEyeOutline,
  IoQrCodeOutline,
} from "react-icons/io5";

const API_BASE = "https://backend-mvp-nine.vercel.app/api";
const USE_DUMMY = true; // <- set ke false kalau mau balik ke API

// -------- dummy seed --------
const DUMMY_SEED = [
  { id: 1,  voucher_code: "ORD-1001", customer: "Ayu Putri",     title: "GreenSpa Sauna Day Pass", category: "Wellness", discount_value: 0.15, scan_date: "2025-09-28T03:45:00Z" },
  { id: 2,  voucher_code: "ORD-1002", customer: "Budi Santoso",  title: "Couple Massage 60m",      category: "Massage",  discount_value: "RM 30", scan_date: "2025-09-28T07:15:00Z" },
  { id: 3,  voucher_code: "ORD-1003", customer: "Chandra Wijaya",title: "Facial Glow",              category: "Facial",   discount_value: 0.25, scan_date: "2025-09-29T10:22:00Z" },
  { id: 4,  voucher_code: "ORD-1004", customer: "Dina Lestari",  title: "Hot Stone Massage",        category: "Massage",  discount_value: "RM 50", scan_date: "2025-09-30T15:40:00Z" },
  { id: 5,  voucher_code: "ORD-1005", customer: "Eko Prasetyo",  title: "Full Body Scrub",          category: "Bodycare", discount_value: 0.1,  scan_date: "2025-09-30T17:05:00Z" },
  { id: 6,  voucher_code: "ORD-1006", customer: "Fina Wulandari",title: "Aromatherapy Massage",     category: "Massage",  discount_value: "RM 25", scan_date: "2025-10-01T08:30:00Z" },
  { id: 7,  voucher_code: "ORD-1007", customer: "Gilang Saputra",title: "Sauna + Ice Bath Combo",   category: "Wellness", discount_value: 0.2,  scan_date: "2025-10-01T12:44:00Z" },
  { id: 8,  voucher_code: "ORD-1008", customer: "Hana Putri",    title: "Hair Spa",                 category: "Salon",    discount_value: "RM 20", scan_date: "2025-10-01T14:10:00Z" },
  { id: 9,  voucher_code: "ORD-1009", customer: "Indra N",       title: "Thai Massage 90m",         category: "Massage",  discount_value: 0.3,  scan_date: "2025-10-01T16:00:00Z" },
  { id:10,  voucher_code: "ORD-1010", customer: "Joko S",        title: "Reflexology 45m",          category: "Massage",  discount_value: "RM 18", scan_date: "2025-10-02T09:00:00Z" },
  { id:11,  voucher_code: "ORD-1011", customer: "Karin A",       title: "Hydrating Facial",         category: "Facial",   discount_value: 0.12, scan_date: "2025-10-02T11:25:00Z" },
  { id:12,  voucher_code: "ORD-1012", customer: "Lia M",         title: "Body Mask",                category: "Bodycare", discount_value: "RM 22", scan_date: "2025-10-02T13:15:00Z" },
  { id:13,  voucher_code: "ORD-1013", customer: "Miko H",        title: "Couple Sauna",             category: "Wellness", discount_value: 0.18, scan_date: "2025-10-02T18:55:00Z" },
  { id:14,  voucher_code: "ORD-1014", customer: "Nadia R",       title: "Makeup Session",           category: "Salon",    discount_value: "RM 40", scan_date: "2025-10-02T19:35:00Z" },
  { id:15,  voucher_code: "ORD-1015", customer: "Oscar T",       title: "Back Massage 30m",         category: "Massage",  discount_value: 0.08, scan_date: "2025-10-03T01:05:00Z" },
];

// ----- helpers -----
const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-MY", { year: "numeric", month: "short", day: "2-digit" });
};

const percentText = (v) => {
  if (v == null || v === "") return "—";
  if (typeof v === "string") return v; // amount like "RM 30"
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (n <= 1) return `${Math.round(n * 100)} %`;
  return `${Math.round(n)} %`;
};

export default function RedemptionTools() {
  // list state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters / pagination
  const [q, setQ] = useState("");
  const [voucherType, setVoucherType] = useState("ALL");
  const [sortBy, setSortBy] = useState("scan_date");
  const [sortDir, setSortDir] = useState("desc");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // dummy state (biar bisa “nambah” saat redeem simulasi)
  const [dummy, setDummy] = useState(DUMMY_SEED);

  // modals
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");

  const token = (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  const fetchRedemptions = async () => {
    setLoading(true);
    setErr("");
    try {
      if (USE_DUMMY) {
        // ----- filter, sort, paginate on dummy -----
        const query = q.trim().toLowerCase();
        let list = [...dummy];

        if (query) {
          list = list.filter((x) =>
            [x.voucher_code, x.customer, x.title, x.category]
              .filter(Boolean)
              .some((s) => s.toLowerCase().includes(query))
          );
        }

        if (voucherType !== "ALL") {
          list = list.filter((x) =>
            voucherType === "PERCENT"
              ? typeof x.discount_value === "number"
              : typeof x.discount_value !== "number"
          );
        }

        const by = sortBy;
        const dir = sortDir === "asc" ? 1 : -1;
        list.sort((a, b) => {
          const pick = (o) => {
            if (by === "scan_date") return new Date(o.scan_date).getTime();
            if (by === "discount_value") {
              if (typeof o.discount_value === "number") return o.discount_value;
              const num = parseFloat(String(o.discount_value).replace(/[^\d.]/g, ""));
              return Number.isNaN(num) ? -Infinity : num;
            }
            return String(o[by] ?? "").toLowerCase();
          };
          const va = pick(a), vb = pick(b);
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        });

        setTotal(list.length);
        setRows(list.slice(offset, offset + limit));
        return;
      }

      // ----- real API mode -----
      const params = {
        limit,
        offset,
        q: q || undefined,
        type: voucherType !== "ALL" ? voucherType : undefined,
        sortBy,
        sortDir,
      };
      const { data } = await axios.get(`${API_BASE}/redemption/list`, {
        params,
        headers: { ...authHeader, "Content-Type": "application/json" },
      });
      const list = Array.isArray(data?.redemptions)
        ? data.redemptions
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setRows(list);
      setTotal(Number(data?.pagination?.total ?? data?.total ?? list.length));
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.error || "Failed to fetch redemptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, voucherType, sortBy, sortDir, limit, offset, dummy]);

  const next = () => setOffset((o) => Math.min(o + limit, (pages - 1) * limit));
  const prev = () => setOffset((o) => Math.max(0, o - limit));
  const openDetail = (r) => { setDetail(r); setDetailOpen(true); };

  const onRedeem = async (e) => {
    e?.preventDefault?.();
    if (!redeemCode.trim()) {
      setRedeemMsg("Enter a voucher code to redeem.");
      return;
    }

    if (USE_DUMMY) {
      // Simulate success + prepend a new record
      setRedeeming(true);
      setTimeout(() => {
        const now = new Date().toISOString();
        const newRow = {
          id: Math.max(...dummy.map((d) => d.id)) + 1,
          voucher_code: redeemCode.trim().toUpperCase(),
          customer: "Walk-in",
          title: "Manual Redeem",
          category: "Misc",
          discount_value: 0.1,
          scan_date: now,
        };
        setDummy((d) => [newRow, ...d]);
        setRedeemMsg("Redeemed (simulated).");
        setRedeemCode("");
        setRedeeming(false);
        setTimeout(() => setRedeemOpen(false), 600);
      }, 500);
      return;
    }

    // Real API redeem (optional)
    try {
      setRedeeming(true);
      setRedeemMsg("");
      const { data } = await axios.post(
        `${API_BASE}/redemption/redeem`,
        { code: redeemCode.trim() },
        { headers: { ...authHeader, "Content-Type": "application/json" } }
      );
      setRedeemMsg(data?.message || "Voucher redeemed.");
      setRedeemCode("");
      await fetchRedemptions();
      setTimeout(() => setRedeemOpen(false), 500);
    } catch (e) {
      console.error(e);
      setRedeemMsg(e?.response?.data?.error || "Redeem failed");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <section className="section redemption-page">
      <style>{css}</style>

      <div className="card soft-card">
        <div className="card-content">
          <div className="level is-mobile">
            <div className="level-left">
              <h1 className="title is-5 mb-0">Redemption Tools</h1>
            </div>
            <div className="level-right" style={{ gap: 8 }}>
              <button className="button is-light icon-only" title="Refresh" onClick={fetchRedemptions}>
                <IoRefresh />
              </button>
              <button className="button is-fuchsia" onClick={() => setRedeemOpen(true)}>
                <span className="icon"><IoQrCodeOutline /></span>
                <span>Redeem Voucher</span>
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar mt-4">
            <div className="toolbar-row">
              <div className="control has-icons-left pill pill-search">
                <input
                  className="input is-rounded"
                  placeholder="Search…"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setOffset(0); }}
                />
                <span className="icon is-left"><IoSearch /></span>
              </div>

              <div className="pill">
                <div className="select is-rounded select-pill">
                  <select
                    value={voucherType}
                    onChange={(e) => { setVoucherType(e.target.value); setOffset(0); }}
                  >
                    <option value="ALL">All Voucher</option>
                    <option value="PERCENT">Percent</option>
                    <option value="AMOUNT">Amount</option>
                  </select>
                </div>
              </div>

              <div className="pill">
                <div className="select is-rounded select-pill">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="scan_date">Scan Date</option>
                    <option value="voucher_code">Voucher Code</option>
                    <option value="title">Title</option>
                    <option value="category">Category</option>
                    <option value="discount_value">Discount Value</option>
                  </select>
                </div>
              </div>

              <div className="pill">
                <div className="select is-rounded select-pill">
                  <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                </div>
              </div>

              <div className="pill pill-right">
                <button className="button is-light icon-only" title="Columns">
                  <IoOptionsOutline />
                </button>
                <button className="button is-light icon-only" title="Filter">
                  <IoFunnelOutline />
                </button>
              </div>
            </div>
          </div>

          {err && <div className="notification is-danger is-light mt-3">{err}</div>}

          {/* Table */}
          <div className="table-wrap mt-4">
            {loading && <progress className="progress is-small is-primary" max="100">Loading…</progress>}

            <table className="table is-fullwidth is-hoverable redemption-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}><input type="checkbox" /></th>
                  <th style={{ width: 90 }}>Actions</th>
                  <th>Voucher Code</th>
                  <th>Customer</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Discount Value</th>
                  <th>Scan Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((r) => (
                  <tr key={r.id}>
                    <td><input type="checkbox" /></td>
                    <td>
                      <button className="icon-ghost" title="View" onClick={() => { setDetail(r); setDetailOpen(true); }}>
                        <IoEyeOutline />
                      </button>
                    </td>
                    <td className="mono">#{r.voucher_code}</td>
                    <td>{r.customer}</td>
                    <td className="ellipsis">{r.title}</td>
                    <td className="muted ellipsis">{r.category}</td>
                    <td className="muted">{percentText(r.discount_value)}</td>
                    <td className="muted">{fmtDate(r.scan_date)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="has-text-centered">
                      <p className="has-text-grey">No data</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / pagination */}
          <div className="level mt-3">
            <div className="level-left">
              <p className="is-size-7 has-text-grey">Page {page} of {pages}</p>
            </div>
            <div className="level-right">
              <nav className="pagination is-small" aria-label="pagination">
                <button className="pagination-ctrl" onClick={prev} disabled={page <= 1}>‹</button>
                <button className={`page-dot ${page === 1 ? "is-current" : ""}`}>1</button>
                {pages >= 2 && (
                  <button
                    className={`page-dot ${page === 2 ? "is-current" : ""}`}
                    onClick={() => setOffset(limit * 1)}
                  >
                    2
                  </button>
                )}
                {pages > 3 && <button className="page-dot" disabled>…</button>}
                {pages >= 3 && (
                  <button className="page-dot" onClick={() => setOffset(limit * (pages - 1))}>
                    {pages}
                  </button>
                )}
                <button className="pagination-ctrl" onClick={next} disabled={page >= pages}>›</button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Redeem modal */}
      <div className={`modal ${redeemOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setRedeemOpen(false)} />
        <div className="modal-card" style={{ maxWidth: 520 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Redeem Voucher</p>
            <button className="delete" aria-label="close" onClick={() => setRedeemOpen(false)} />
          </header>
          <form onSubmit={onRedeem}>
            <section className="modal-card-body">
              <div className="field">
                <label className="label">Voucher Code</label>
                <div className="control has-icons-left">
                  <input
                    className="input"
                    placeholder="e.g. ORD12345"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                  />
                  <span className="icon is-left"><IoQrCodeOutline /></span>
                </div>
              </div>
              {redeemMsg && (
                <div className={`notification is-light ${redeemMsg.toLowerCase().includes("fail") ? "is-danger" : "is-success"}`}>
                  {redeemMsg}
                </div>
              )}
            </section>
            <footer className="modal-card-foot is-justify-content-flex-end">
              <button type="button" className="button" onClick={() => setRedeemOpen(false)} disabled={redeeming}>
                Cancel
              </button>
              <button type="submit" className={`button is-primary ${redeeming ? "is-loading" : ""}`} disabled={redeeming}>
                Redeem
              </button>
            </footer>
          </form>
        </div>
      </div>

      {/* Detail modal */}
      <div className={`modal ${detailOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setDetailOpen(false)} />
        <div className="modal-card" style={{ maxWidth: 680 }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Redemption Detail</p>
            <button className="delete" aria-label="close" onClick={() => setDetailOpen(false)} />
          </header>
          <section className="modal-card-body">
            {detail ? (
              <div className="content">
                <p><strong>Voucher Code:</strong> #{detail.voucher_code}</p>
                <p><strong>Customer:</strong> {detail.customer}</p>
                <p><strong>Title:</strong> {detail.title}</p>
                <p><strong>Category:</strong> {detail.category}</p>
                <p><strong>Discount:</strong> {percentText(detail.discount_value)}</p>
                <p><strong>Scan Date:</strong> {fmtDate(detail.scan_date)}</p>
              </div>
            ) : null}
          </section>
          <footer className="modal-card-foot is-justify-content-flex-end">
            <button className="button" onClick={() => setDetailOpen(false)}>
              Close
            </button>
          </footer>
        </div>
      </div>
    </section>
  );
}

/* --------- styles (inline) --------- */
const css = `
.redemption-page .soft-card { border:1px solid #eceff4; border-radius:14px; box-shadow:0 4px 20px rgba(20,20,43,.06); }

.toolbar-row { display:flex; flex-wrap:wrap; gap:.6rem; align-items:center; }
.pill { display:flex; align-items:center; }
.pill-right { margin-left:auto; gap:.5rem; }
.button.icon-only { width:36px; height:36px; padding:0; display:inline-flex; align-items:center; justify-content:center; border-radius:10px; }
.button.is-fuchsia { background:#ff2d87; border-color:#ff2d87; color:#fff; }
.button.is-fuchsia:hover { filter:brightness(.96); }

.select-pill select, .toolbar .input { border-radius:9999px !important; background:#f7f8fb; border-color:#e9edf2; }
.pill-search { min-width:260px; }

.table-wrap { border:1px solid #eef1f6; border-radius:12px; overflow:hidden; }
.redemption-table thead th { background:#fbfcfe; color:#6b7280; font-weight:600; font-size:.85rem; border-color:#eef1f6; }
.redemption-table td { vertical-align:middle; }
.icon-ghost { width:28px; height:28px; border-radius:50%; border:1px solid #e7eaf0; background:#fff; display:inline-flex; align-items:center; justify-content:center; color:#6b7280; }
.icon-ghost:hover { background:#f7f8fb; }

.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.muted { color:#6b7280; }
.ellipsis { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.pagination-ctrl, .page-dot { border:1px solid #e7eaf0; background:#fff; border-radius:8px; padding:6px 10px; margin-left:6px; }
.page-dot.is-current { background:#6d28d9; border-color:#6d28d9; color:#fff; }
`;
