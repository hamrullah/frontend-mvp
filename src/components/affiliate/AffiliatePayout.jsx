import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";

/* ================= DUMMY DATA ================= */
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const summaryTop = [
  { key: "income",     title: "INCOME",     value: 53765,   delta: +10.9 },
  { key: "checkout",   title: "CHECKOUT",   value: 2321,    delta: +6.3  },
  { key: "commission", title: "COMMISSION", value: 22451,   delta: -0.7  },
];

const commissionBars = [
  { m: "Jan", value: 34 },
  { m: "Feb", value: 22 },
  { m: "Mar", value: 51 },
  { m: "Apr", value: 45 },
  { m: "May", value: 28 },
  { m: "Jun", value: 53 },
  { m: "Jul", value: 41 },
  { m: "Aug", value: 49 },
];

const orderKpis = [
  { key: "total",      label: "TOTAL ORDERS",     value: 5980,  trend: +3.1,  tone: "up",   big: true },
  { key: "pending",    label: "PENDING ORDERS",   value: 1533,  trend: +3.5,  tone: "up" },
  { key: "completed",  label: "COMPLETED ORDER",  value: 3829,  trend: -1.6,  tone: "down" },
  { key: "refunded",   label: "REFUNDED ORDER",   value: 22,    trend: +1.5,  tone: "up" },
  { key: "cancelled",  label: "CANCELLED ORDER",  value: 576,   trend: +2.4,  tone: "up" },
];

const sampleRows = [
  { id:"#ORD812345", customer:"Darkness Robertson", product:"Queen spa / Luxury Spa…", date:"Aug 8, 2024", qty:2, status:"Cancelled",  payment:120.00 },
  { id:"#ORD767880", customer:"Jane Cooper",         product:"Queen spa / Luxury Spa…", date:"Jul 23, 2024", qty:3, status:"Refunded",   payment:140.00 },
  { id:"#ORD284546", customer:"Jenny Wilson",        product:"Queen spa / Luxury Spa…", date:"Jun 13, 2024", qty:4, status:"Completed",  payment:255.00 },
  { id:"#ORD845267", customer:"Robert Fox",          product:"Queen spa / Luxury Spa…", date:"May 7, 2024",  qty:1, status:"Pending",    payment:130.00 },
  { id:"#ORD487678", customer:"Wade Warren",         product:"Queen spa / Luxury Spa…", date:"Apr 1, 2024",  qty:2, status:"Pending",    payment:175.00 },
  { id:"#ORD575789", customer:"Albert Flores",       product:"Queen spa / Luxury Spa…", date:"Mar 2, 2024",  qty:2, status:"Completed",  payment:252.00 },
  { id:"#ORD718071", customer:"Ronald Richards",     product:"Queen spa / Luxury Spa…", date:"Feb 28, 2024", qty:1, status:"Pending",    payment:60.00  },
  { id:"#ORD880132", customer:"Darrell Steward",     product:"Queen spa / Luxury Spa…", date:"Jan 26, 2024", qty:1, status:"Cancelled",  payment:80.00  },
  { id:"#ORD910213", customer:"Cameron Williamson",  product:"Queen spa / Luxury Spa…", date:"Jan 24, 2024", qty:2, status:"Complete",   payment:90.00  },
  { id:"#ORD901245", customer:"Albert Pena",         product:"Queen spa / Luxury Spa…", date:"Jan 12, 2024", qty:1, status:"Completed",  payment:99.90  },
];
// gandakan biar keliatan paging
const tableRows = Array.from({ length: 120 }, (_, i) => {
  const base = sampleRows[i % sampleRows.length];
  return { ...base, id: `${base.id}-${String(i + 1).padStart(2, "0")}` };
});

/* ================= HELPERS ================= */
const fmtMoney = (n) =>
  new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(Number(n||0));

const compact = (n) =>
  Math.abs(n) >= 1_000_000 ? `${(n/1_000_000).toFixed(1).replace(/\.0$/,"")}m`
  : Math.abs(n) >= 1_000 ? `${(n/1_000).toFixed(1).replace(/\.0$/,"")}k`
  : String(n);

const exportCSV = (rows) => {
  const header = ["Order","Customer","Product","Date","Qty","Status","Payment"].join(",");
  const lines = rows.map(r =>
    [r.id, r.customer, r.product, r.date, r.qty, r.status, r.payment].join(",")
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `payout_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
};

/* ================= PAGE ================= */
export default function Payout() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tableRows.filter((r) =>
      `${r.id} ${r.customer} ${r.product} ${r.date} ${r.status}`
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = useMemo(
    () => filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page, perPage]
  );

  return (
    <section className="payout-page">
      <style>{styles}</style>

      {/* Header */}
      <div className="header-row">
        <h1>Payout</h1>
        <div className="header-actions">
          <button className="icon-btn" title="More">⋯</button>
          <select className="select-pill" defaultValue="Monthly">
            <option>Monthly</option>
            <option>Weekly</option>
            <option>Daily</option>
          </select>
          <button className="btn pink" onClick={() => exportCSV(filtered)}>⬇︎ Download</button>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid metrics">
        {summaryTop.map((m) => {
          const up = m.delta >= 0;
          return (
            <div className="card metric" key={m.key}>
              <div className="label-row">
                <span className="tiny"> {m.title} </span>
                <span className="dot">i</span>
              </div>
              <div className="big">
                {m.key === "income" ? fmtMoney(m.value) : compact(m.value)}
              </div>
              <div className={`delta ${up ? "up" : "down"}`}>
                <span className="chip-dot" />
                {Math.abs(m.delta)}% <span className="muted">vs last month</span>
              </div>
            </div>
          );
        })}

        {/* Commission + My Card */}
        <div className="grid two-col">
          <div className="card commission-card">
            <div className="card-head">
              <div>
                <div className="tiny">Commission</div>
                <div className="num">$44k <span className="tiny muted">+5.1%</span></div>
              </div>
              <div className="right">
                <select className="select-chip"><option>Month</option></select>
              </div>
            </div>

            <div className="bars">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={commissionBars} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF1F6" strokeDasharray="4 4" />
                  <XAxis dataKey="m" tick={{ fill:"#64748B" }} />
                  <YAxis tick={{ fill:"#64748B" }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" radius={[6,6,0,0]}>
                    <LabelList dataKey="value" position="top" formatter={(v) => `$${v}`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card card-side">
            <div className="fakecard">
              <div className="top">
                <strong>John Smith</strong>
                <span className="switch" />
              </div>
              <div className="numline">**** **** **** 3761</div>
              <div className="brand">VISA</div>
            </div>

            <div className="balance">
              <div className="tiny muted">Current Balance</div>
              <div className="big">$1,480,000</div>
              <button className="btn ghost">Withdraw</button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders KPIs */}
      <div className="card kpi-wrap">
        <div className="kpi-grid">
          {orderKpis.map((k) => (
            <div className={`kpi ${k.big ? "big" : ""}`} key={k.key}>
              <div className="k-top">
                <span className="tiny">{k.label}</span>
                <button className="icon-mini">⟳</button>
              </div>
              <div className="k-val">{compact(k.value)}</div>
              <div className={`k-delta ${k.tone === "up" ? "up" : "down"}`}>
                <span className="chip-dot"></span>
                {Math.abs(k.trend)}% <span className="muted">from last month</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card table-card">
        <div className="table-head">
          <div className="left">
            <div className="search">
              <input
                placeholder="Search…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <select className="select-chip">
              <option>All Orders</option>
            </select>
          </div>
          <div className="right">
            <button className="icon-btn" title="Columns">▦</button>
            <button className="icon-btn" title="Filter">⛃</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Orders</th>
                <th>Customer</th>
                <th>Product Info</th>
                <th>Order date</th>
                <th className="right">Orders</th>
                <th>Status</th>
                <th className="right">Payment</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td>{r.customer}</td>
                  <td className="ellipsis">{r.product}</td>
                  <td>{r.date}</td>
                  <td className="right">{r.qty}</td>
                  <td>
                    <span className={`tag ${r.status.toLowerCase()}`}>{r.status}</span>
                  </td>
                  <td className="right">{fmtMoney(r.payment)}</td>
                </tr>
              ))}
              {!paged.length && (
                <tr><td colSpan={7} className="center muted">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pager">
          <div className="muted tiny">Page {page} of {totalPages}</div>
          <div className="pager-ctrl">
            <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page<=1}>‹</button>
            <button className={`dot ${page===1 ? "is-current":""}`} onClick={() => setPage(1)}>1</button>
            {totalPages >= 2 && <button className={`dot ${page===2 ? "is-current":""}`} onClick={() => setPage(2)}>2</button>}
            {totalPages > 3 && <button className="dot" disabled>…</button>}
            {totalPages >= 3 && <button className="dot" onClick={() => setPage(totalPages)}>{totalPages}</button>}
            <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page>=totalPages}>›</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= STYLES ================= */
const styles = `
.payout-page{ padding:10px; }

/* helpers */
.tiny{ font-size:12px; font-weight:600; color:#64748B; }
.muted{ color:#94A3B8; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.right{ text-align:right; }
.center{ text-align:center; }

/* header */
.header-row{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.header-row h1{ font-size:18px; font-weight:800; color:#0f172a; }
.header-actions{ display:flex; gap:8px; align-items:center; }
.icon-btn{
  width:36px; height:36px; border-radius:10px; border:1px solid #E7EAF0;
  background:#fff; color:#6b7280; display:inline-flex; align-items:center; justify-content:center;
}
.select-pill{ height:36px; border:1px solid #E7EAF0; border-radius:10px; padding:0 10px; background:#fff; }
.btn.pink{
  height:36px; padding:0 12px; border-radius:10px; border:0; color:#fff; background:#ff2d87;
  font-weight:700; box-shadow:0 8px 18px rgba(255,45,135,.25);
}
.btn.ghost{
  height:36px; padding:0 14px; border-radius:10px; border:1px solid #E7EAF0; background:#fff; color:#111827;
}

/* cards & grid */
.card{ background:#fff; border:1px solid #ECEFF4; border-radius:14px; box-shadow:0 6px 24px rgba(20,20,43,.06); }
.grid{ display:grid; gap:12px; }
.metrics{ grid-template-columns: repeat(3, 1fr); }
.two-col{ grid-column:1 / -1; display:grid; grid-template-columns: 2fr 1.2fr; gap:12px; }

/* metric cards */
.metric{ padding:14px 16px; }
.metric .label-row{ display:flex; align-items:center; justify-content:space-between; }
.metric .dot{ width:18px; height:18px; border-radius:50%; border:1px solid #E7EAF0; display:flex; align-items:center; justify-content:center; color:#94A3B8; font-size:11px; }
.metric .big{ font-size:22px; font-weight:800; margin-top:6px; color:#0f172a; }
.metric .delta{ margin-top:4px; display:flex; align-items:center; gap:8px; font-size:12px; }
.metric .delta .chip-dot{ width:8px; height:8px; border-radius:50%; display:inline-block; }
.metric .delta.up { color:#16A34A; }
.metric .delta.up .chip-dot{ background:#16A34A; }
.metric .delta.down{ color:#EF4444; }
.metric .delta.down .chip-dot{ background:#EF4444; }

/* commission block */
.commission-card{ padding:12px; }
.commission-card .card-head{ display:flex; align-items:flex-end; justify-content:space-between; }
.commission-card .num{ font-size:22px; font-weight:800; color:#111827; }
.select-chip{ height:32px; border:1px solid #E7EAF0; border-radius:10px; padding:0 10px; background:#fff; }

/* my card */
.card-side{ padding:12px; display:flex; flex-direction:column; gap:12px; }
.fakecard{
  border-radius:16px; padding:16px; background: radial-gradient(140% 140% at 80% -10%, #1F2937 0, #0B1220 60%);
  color:#E5E7EB; height:150px; position:relative; box-shadow:0 10px 26px rgba(0,0,0,.25);
}
.fakecard .top{ display:flex; align-items:center; justify-content:space-between; }
.fakecard .switch{ width:18px; height:18px; border-radius:50%; background:#fff2; border:1px solid #fff3; }
.fakecard .numline{ margin-top:28px; font-size:18px; letter-spacing:2px; }
.fakecard .brand{ position:absolute; right:14px; bottom:12px; font-weight:800; letter-spacing:1px; color:#9CA3AF; }
.balance .big{ font-size:22px; font-weight:800; color:#0f172a; margin:6px 0 10px; }

/* KPI small cards */
.kpi-wrap{ margin-top:12px; }
.kpi-grid{ display:grid; grid-template-columns: 2fr repeat(4, 1fr); gap:10px; }
.kpi{ border:1px solid #EEF1F6; border-radius:12px; padding:12px; background:#fff; }
.kpi.big{ grid-column:1 / span 1; }
.k-top{ display:flex; align-items:center; justify-content:space-between; }
.icon-mini{ width:26px; height:26px; border-radius:8px; border:1px solid #E7EAF0; background:#fff; color:#6b7280; }
.k-val{ font-size:20px; font-weight:800; color:#0f172a; margin-top:4px; }
.k-delta{ font-size:12px; margin-top:4px; display:flex; gap:8px; align-items:center; }
.k-delta .chip-dot{ width:8px; height:8px; border-radius:50%; display:inline-block; }
.k-delta.up{ color:#16A34A; } .k-delta.up .chip-dot{ background:#16A34A; }
.k-delta.down{ color:#EF4444; } .k-delta.down .chip-dot{ background:#EF4444; }

/* table */
.table-card{ margin-top:12px; padding:12px; }
.table-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.table-head .left{ display:flex; gap:8px; align-items:center; }
.search input{
  height:34px; border:1px solid #E7EAF0; border-radius:10px; padding:0 10px; min-width:220px; background:#fff;
}
.table-wrap{ border:1px solid #EEF1F6; border-radius:10px; overflow:auto; }
.table{ width:100%; border-collapse:collapse; }
.table thead th{
  background:#FBFCFE; color:#6b7280; font-weight:700; font-size:12px; text-align:left; padding:10px; border-bottom:1px solid #EEF1F6;
}
.table tbody td{ padding:10px; border-bottom:1px solid #F3F5F9; vertical-align:middle; font-size:14px; }
.ellipsis{ max-width:360px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tag{ padding:4px 8px; border-radius:999px; font-size:12px; font-weight:700; }
.tag.completed, .tag.complete{ background:#E8F9EE; color:#16A34A; border:1px solid #CFF5DA; }
.tag.pending{ background:#FFF7ED; color:#F59E0B; border:1px solid #FFE9C6; }
.tag.cancelled{ background:#FFE4E6; color:#EF4444; border:1px solid #FFC7CF; }
.tag.refunded{ background:#E0F2FE; color:#0284C7; border:1px solid #BAE6FD; }

/* pager */
.pager{ display:flex; align-items:center; justify-content:space-between; padding-top:10px; }
.pager-ctrl{ display:flex; gap:6px; align-items:center; }
.pager-ctrl button{
  border:1px solid #E7EAF0; background:#fff; color:#111827; border-radius:8px; padding:6px 10px;
}
.pager-ctrl .dot{ width:auto; min-width:32px; }
.pager-ctrl .is-current{ background:#6D28D9; border-color:#6D28D9; color:#fff; }

/* responsive */
@media (max-width: 1100px){
  .metrics{ grid-template-columns: 1fr; }
  .two-col{ grid-template-columns: 1fr; }
  .kpi-grid{ grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px){
  .kpi-grid{ grid-template-columns: 1fr; }
}
`;
