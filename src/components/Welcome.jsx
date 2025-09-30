import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

// ====== HELPERS ======
const normalize = (data) =>
  Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

// Format to Malaysian Ringgit (MYR)
const toRinggit = (n) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2 })
    .format(Number(n || 0));

const parseYMD = (s) => {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
};

const statusText = (v) => {
  if (Number(v) === 1) return "completed";
  if (Number(v) === 0) return "pending";
  return String(v ?? "");
};

export default function SalesAnalyticsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [me, setMe] = useState(null);

  // Date range default: last 30 days
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  const defaultEnd = localToday.toISOString().slice(0, 10);
  const defaultStart = new Date(localToday);
  defaultStart.setDate(defaultStart.getDate() - 29);
  const defaultStartStr = defaultStart.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStartStr);
  const [endDate, setEndDate] = useState(defaultEnd);

  // === Get token from Redux or localStorage ===
  const reduxToken = useSelector((s) => s?.auth?.token);
  const storedToken =
    typeof window !== "undefined"
      ? localStorage.getItem("auth_token") || localStorage.getItem("token")
      : null;
  const token = reduxToken || storedToken || null;

  // Auth header consistent with /api/auth/me (Bearer). withCredentials true if you use HttpOnly cookie.
  const axiosAuthConfig = {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  };

  // === Check auth via /api/auth/me ===
  const checkAuth = async () => {
    setAuthLoading(true);
    setError("");
    try {
      const { data } = await axios.get("http://localhost:3000/api/auth/me", axiosAuthConfig);
      setMe(data?.user || null);
    } catch (e) {
      console.error(e);
      setMe(null);
      setError("Unauthorized. Please sign in first.");
    } finally {
      setAuthLoading(false);
    }
  };

  // === Fetch orders ===
  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      // CHANGE THE URL below to match your order endpoint if different
      const { data } = await axios.post(
        "http://localhost:3000/api/orders/list",
        { limit: 5000, offset: 0 },
        axiosAuthConfig
      );
      setOrders(normalize(data));
    } catch (e) {
      console.error(e);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await checkAuth();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && me) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, me]);

  // ====== FILTERS ======
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const start = parseYMD(startDate);
    const end = parseYMD(endDate);
    return orders
      .filter((o) => {
        const dt = parseYMD(o.tanggal);
        const inDate = dt && start && end ? dt >= start && dt <= end : true;
        const inText = [o.code_trx, o.name, o.tanggal, o.total_harga, o.status]
          .map((v) => (v == null ? "" : String(v)))
          .join(" ")
          .toLowerCase()
          .includes(q);
        return inDate && inText;
      })
      .sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1));
  }, [orders, query, startDate, endDate]);

  // ====== AGGREGATIONS ======
  const dailySeries = useMemo(() => {
    const map = new Map();
    filtered.forEach((o) => {
      const key = o.tanggal; // assume YYYY-MM-DD
      const cur = map.get(key) || { date: key, revenue: 0, count: 0 };
      cur.revenue += Number(o.total_harga || 0);
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [filtered]);

  const customerSeries = useMemo(() => {
    const map = new Map();
    filtered.forEach((o) => {
      const key = o.name || "—";
      const cur = map.get(key) || { customer: key, revenue: 0, count: 0 };
      cur.revenue += Number(o.total_harga || 0);
      cur.count += 1;
      map.set(key, cur);
    });
    const arr = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    return arr.slice(0, 10);
  }, [filtered]);

  const statusSeries = useMemo(() => {
    const map = new Map();
    filtered.forEach((o) => {
      const key = statusText(o.status);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => ({ revenue: acc.revenue + Number(r.total_harga || 0), count: acc.count + 1 }),
        { revenue: 0, count: 0 }
      ),
    [filtered]
  );

  // ====== CSV EXPORT ======
  const csvEscape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const downloadCSV = (filename, rowsArr, columns) => {
    const header = columns.map((c) => csvEscape(c.label)).join(",");
    const lines = rowsArr.map((r) =>
      columns
        .map((c) => {
          const raw = typeof c.value === "function" ? c.value(r) : r[c.key];
          return csvEscape(raw);
        })
        .join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportOrdersCSV = () => {
    if (!filtered.length) return;
    const cols = [
      { label: "Transaction Code", key: "code_trx" },
      { label: "Date", key: "tanggal" },
      { label: "Customer", key: "name" },
      { label: "Total Amount", key: "total_harga" },
      { label: "Status", value: (r) => statusText(r.status) },
    ];
    downloadCSV(`orders_${Date.now()}.csv`, filtered, cols);
  };

  const exportDailyCSV = () => {
    if (!dailySeries.length) return;
    const cols = [
      { label: "Date", key: "date" },
      { label: "Order Count", key: "count" },
      { label: "Revenue", key: "revenue" },
    ];
    downloadCSV(`daily_${Date.now()}.csv`, dailySeries, cols);
  };

  // Helpers for compact number ticks (k/m)
  const compactTick = (v) => {
    const n = Number(v || 0);
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
    return String(n);
  };

  // ====== UI ======
  return (
    <section className="section">
      <div className="container">
        {/* Header */}
        <nav className="level">
          <div className="level-left">
            <div>
              <h1 className="title">Sales Analytics</h1>
              <p className="subtitle is-6">Order analytics by period</p>
            </div>
          </div>
          <div className="level-right">
            <div className="field has-addons">
              <p className="control is-expanded">
                <input
                  className="input"
                  type="text"
                  placeholder="Search (code/customer/number)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </p>
              <p className="control">
                <button className="button" onClick={fetchOrders}>Refresh</button>
              </p>
              <p className="control">
                <button className="button is-link" onClick={exportOrdersCSV} disabled={!filtered.length}>
                  Export Orders CSV
                </button>
              </p>
              <p className="control">
                <button className="button is-link is-light" onClick={exportDailyCSV} disabled={!dailySeries.length}>
                  Export Daily CSV
                </button>
              </p>
            </div>
          </div>
        </nav>

        {/* Filters */}
        <div className="box">
          <div className="columns is-multiline is-vcentered">
            <div className="column is-3">
              <label className="label">Start Date</label>
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="column is-3">
              <label className="label">End Date</label>
              <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="column is-6">
              <article className="message is-info is-light">
                <div className="message-body">
                  Showing <strong>{filtered.length}</strong> orders. Total revenue: <strong>{toRinggit(totals.revenue)}</strong>
                </div>
              </article>
            </div>
          </div>
        </div>

        {/* Alerts / Loader */}
        {error && <div className="notification is-danger is-light">{error}</div>}
        {(loading || authLoading) ? (
          <progress className="progress is-small is-primary" max="100">Loading…</progress>
        ) : null}

        {/* Charts */}
        <div className="columns is-multiline">
          {/* Line: Revenue per Day */}
          <div className="column is-12">
            <div className="card">
              <header className="card-header">
                <p className="card-header-title">Revenue per Day</p>
              </header>
              <div className="card-content" style={{ height: 320 }}>
                {dailySeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailySeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => {
                          const dt = parseYMD(d);
                          return dt ? dt.toLocaleDateString("en-MY", { day: "2-digit", month: "short" }) : d;
                        }}
                      />
                      <YAxis tickFormatter={compactTick} />
                      <Tooltip formatter={(value, name) => [name === "revenue" ? toRinggit(value) : value, name === "revenue" ? "Revenue" : "Order Count"]} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Revenue" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="count" name="Order Count" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="has-text-grey">No data for this date range.</p>
                )}
              </div>
            </div>
          </div>

          {/* Bar: Top Customers */}
          <div className="column is-12">
            <div className="card">
              <header className="card-header">
                <p className="card-header-title">Top Customers (by Revenue)</p>
              </header>
              <div className="card-content" style={{ height: 360 }}>
                {customerSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customerSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="customer" interval={0} angle={-15} textAnchor="end" height={70} />
                      <YAxis tickFormatter={compactTick} />
                      <Tooltip formatter={(value) => toRinggit(value)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="has-text-grey">No customer data in this range.</p>
                )}
              </div>
            </div>
          </div>

          {/* Pie: Order Status */}
          <div className="column is-6">
            <div className="card">
              <header className="card-header">
                <p className="card-header-title">Status Distribution</p>
              </header>
              <div className="card-content" style={{ height: 320 }}>
                {statusSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie dataKey="value" data={statusSeries} outerRadius={100} label>
                        {statusSeries.map((entry, index) => (
                          <Cell key={`cell-${index}`} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="has-text-grey">No status data.</p>
                )}
              </div>
            </div>
          </div>

          {/* Daily summary table */}
          <div className="column is-6">
            <div className="card">
              <header className="card-header">
                <p className="card-header-title">Daily Summary</p>
              </header>
              <div className="card-content">
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable is-narrow">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="has-text-right">Orders</th>
                        <th className="has-text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySeries.length ? (
                        dailySeries.map((r) => (
                          <tr key={r.date}>
                            <td>{new Date(r.date).toLocaleDateString("en-MY")}</td>
                            <td className="has-text-right">{r.count}</td>
                            <td className="has-text-right">{toRinggit(r.revenue)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="has-text-centered has-text-grey">
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {dailySeries.length > 0 && (
                      <tfoot>
                        <tr>
                          <th>Total</th>
                          <th className="has-text-right">
                            {dailySeries.reduce((a, b) => a + b.count, 0)}
                          </th>
                          <th className="has-text-right">
                            {toRinggit(dailySeries.reduce((a, b) => a + b.revenue, 0))}
                          </th>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="has-text-grey is-size-7" style={{ marginTop: 12 }}>
          Data source: <code>POST /api/orders/list</code> (client-side date filter)
        </p>
      </div>
    </section>
  );
}
