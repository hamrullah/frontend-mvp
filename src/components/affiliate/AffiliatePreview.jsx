import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

/* ========= DUMMY DATA ========= */
const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

// 5 series: Visitor, Product View, AddToCart, Checkout, Complete
const SERIES = [
  { key: "visitor", label: "VISITOR", color: "#7C3AED" },       // purple
  { key: "productView", label: "PRODUCT VIEW", color: "#10B981" }, // green
  { key: "addToCart", label: "ADD TO CART", color: "#F59E0B" }, // amber
  { key: "checkout", label: "CHECKOUT", color: "#06B6D4" },     // cyan
  { key: "complete", label: "COMPLETE", color: "#EF4444" },     // red
];

// activity points per month (dummy, mirip screenshot tren)
const ACTIVITY = [
  { m: "Jan",  visitor: 12000, productView: 9000, addToCart: 4800, checkout: 8300, complete: 8200 },
  { m: "Feb",  visitor: 14000, productView: 10000, addToCart: 5400, checkout: 9200, complete: 7600 },
  { m: "Mar",  visitor: 11000, productView: 9500, addToCart: 5200, checkout: 8700, complete: 7800 },
  { m: "Apr",  visitor: 10000, productView: 8800, addToCart: 5600, checkout: 7900, complete: 7200 },
  { m: "Mei",  visitor: 18000, productView: 12000, addToCart: 6000, checkout: 8800, complete: 7400 },
  { m: "Jun",  visitor: 17000, productView: 11000, addToCart: 5200, checkout: 9100, complete: 7600 },
  { m: "Jul",  visitor: 16000, productView: 10800, addToCart: 4400, checkout: 8600, complete: 7400 },
  { m: "Agu",  visitor: 13000, productView: 9800,  addToCart: 4100, checkout: 7500, complete: 7100 },
  { m: "Sep",  visitor: 15000, productView: 9300,  addToCart: 4700, checkout: 6800, complete: 6900 },
  { m: "Okt",  visitor: 19000, productView: 10200, addToCart: 5200, checkout: 7700, complete: 7400 },
  { m: "Nov",  visitor: 17000, productView: 9100,  addToCart: 4900, checkout: 7200, complete: 7000 },
  { m: "Des",  visitor: 16000, productView: 8800,  addToCart: 4600, checkout: 7000, complete: 6800 },
];

// Summary cards (dummy persis angka contoh)
const SUMMARY = [
  { key: "income",     title: "INCOME",       value: 53765,  delta: +10.9 },
  { key: "avgSales",   title: "AVG. SALES",   value: 16459,  delta: +6.2  },
  { key: "sold",       title: "PRODUCT SOLD", value: 22451,  delta: -0.7  },
  { key: "commission", title: "COMMISSION",   value: 516000, delta: -15.2 },
];

/* ========= HELPERS ========= */
const fmtMYR = (n) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 0 }).format(n);

const fmtNumber = (n) =>
  Math.abs(n) >= 1000
    ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "")}K`
    : String(n);

const compact = (n) =>
  Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`
  : Math.abs(n) >= 1_000 ? `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  : String(n);

const dlCSV = (rows, name = "performance.csv") => {
  const header = ["Month", ...SERIES.map(s => s.label)].join(",");
  const lines = rows.map(r => [r.m, ...SERIES.map(s => r[s.key])].join(","));
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

/* ========= COMPONENT ========= */
export default function PerformancePreview() {
  // totals bar kecil di bawah judul chart
  const totals = useMemo(() => {
    const sum = (key) => ACTIVITY.reduce((a, b) => a + Number(b[key] || 0), 0);
    return {
      visitor: sum("visitor"),
      productView: sum("productView"),
      addToCart: sum("addToCart"),
      checkout: sum("checkout"),
      complete: sum("complete"),
    };
  }, []);

  return (
    <section className="perf-page">
      <style>{css}</style>
    <br></br>
      <div className="card soft">
        {/* Header row */}
        <div className="card-head">
          <h1>Performance Preview</h1>
          <div className="actions">
            <button className="icon-btn" title="Options">⚙️</button>
            <select className="select-pill" defaultValue="Monthly">
              <option>Monthly</option>
              <option>Weekly</option>
              <option>Daily</option>
            </select>
            <button className="btn pink" onClick={() => dlCSV(ACTIVITY, "performance.csv")}>⬇︎ Download</button>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="summary-grid">
          {SUMMARY.map((m) => {
            const up = m.delta >= 0;
            const main =
              m.key === "commission" ? fmtNumber(m.value) : fmtMYR(m.value);
            return (
              <div className="metric" key={m.key}>
                <div className="meta">
                  <span className="title">{m.title}</span>
                  <span className="info">ⓘ</span>
                </div>
                <div className="value">{main}</div>
                <div className={`delta ${up ? "up" : "down"}`}>
                  <span className="dot" />
                  {Math.abs(m.delta)}% <span className="muted">vs last month</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chart card */}
        <div className="chart-card">
          <div className="chart-top">
            <div className="left">
              <span className="cap">CUSTOMER ACTIVITIES</span>
              <span className="chip up">↑ 3.5%</span>
            </div>
            <div className="right">
              <select className="select-chip"><option>All Products</option></select>
              <select className="select-chip"><option>All Categories</option></select>
            </div>
          </div>

          {/* mini legend counts */}
          <div className="mini-legend">
            {SERIES.map((s, i) => (
              <div className="leg" key={s.key}>
                <span className="swatch" style={{ background: s.color }} />
                <strong>{s.label}</strong>
                <span className="count">
                  {compact(
                    totals[s.key] / MONTHS.length // rata-rata per bulan biar mirip contoh
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Line chart */}
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={ACTIVITY} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#EEF1F6" strokeDasharray="4 4" />
                <XAxis dataKey="m" tick={{ fill: "#64748B" }} />
                <YAxis tick={{ fill: "#64748B" }} tickFormatter={(v) => compact(v)} />
                <Tooltip
                  formatter={(v, name) => [v, SERIES.find(s => s.key === name)?.label || name]}
                  labelStyle={{ color: "#111827" }}
                />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                {SERIES.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.key}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ========= STYLES ========= */
const css = `
.perf-page { padding: 6px; }
.card.soft{
  border:1px solid #eceff4; border-radius:16px;
  background:#fff; box-shadow:0 6px 24px rgba(20,20,43,.06);
  padding: 14px 14px 18px;
}

/* header */
.card-head{ display:flex; align-items:center; justify-content:space-between; }
.card-head h1{ font-size:18px; font-weight:700; color:#0f172a; }
.actions{ display:flex; gap:8px; align-items:center; }
.icon-btn{
  width:36px; height:36px; display:flex; align-items:center; justify-content:center;
  border:1px solid #E7EAF0; background:#fff; border-radius:10px; color:#64748B;
}
.select-pill{
  height:36px; border:1px solid #E7EAF0; background:#fff; border-radius:10px; padding:6px 10px;
}
.btn.pink{
  height:36px; padding:0 12px; border-radius:10px; border:0;
  background:#ff2d87; color:#fff; font-weight:700; box-shadow:0 8px 18px rgba(255,45,135,.25);
}

/* summary metrics */
.summary-grid{
  display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-top:14px;
}
.metric{
  border:1px solid #EEF1F6; border-radius:12px; padding:14px 16px; background:#fff;
}
.metric .meta{ display:flex; align-items:center; justify-content:space-between; color:#64748B; font-size:12px; }
.metric .title{ letter-spacing:.02em; }
.metric .info{ opacity:.6; }
.metric .value{ font-size:22px; font-weight:800; margin-top:6px; color:#0f172a; }
.metric .delta{ margin-top:4px; display:flex; align-items:center; gap:8px; font-size:12px; }
.metric .delta .dot{ width:8px; height:8px; border-radius:50%; display:inline-block; }
.metric .delta.up   { color:#16A34A; }
.metric .delta.up .dot{ background:#16A34A; }
.metric .delta.down { color:#EF4444; }
.metric .delta.down .dot{ background:#EF4444; }
.metric .muted{ color:#94A3B8; }

/* chart card */
.chart-card{
  margin-top:12px; border:1px solid #EEF1F6; border-radius:14px; padding:14px;
}
.chart-top{ display:flex; align-items:center; justify-content:space-between; }
.chart-top .cap{ font-size:12px; color:#64748B; font-weight:700; letter-spacing:.02em; }
.chart-top .chip{
  margin-left:8px; font-size:12px; font-weight:700; padding:4px 8px; border-radius:999px;
}
.chart-top .chip.up{ background:#E8F9EE; color:#16A34A; border:1px solid #CFF5DA; }
.select-chip{ border:1px solid #E7EAF0; background:#fff; border-radius:10px; padding:6px 10px; margin-left:8px; }

/* mini legend line */
.mini-legend{ display:flex; flex-wrap:wrap; gap:18px; margin:10px 6px 0; }
.leg{ display:flex; align-items:center; gap:8px; color:#475569; font-size:12px; }
.swatch{ width:8px; height:8px; border-radius:50%; display:inline-block; }
.count{ font-weight:700; margin-left:6px; color:#111827; }

/* chart */
.chart-wrap{ margin-top:8px; }
@media (max-width: 1024px){
  .summary-grid{ grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px){
  .summary-grid{ grid-template-columns: 1fr; }
}
`;
