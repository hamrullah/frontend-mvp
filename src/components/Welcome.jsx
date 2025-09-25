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

const toRupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
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
  if (Number(v) === 1) return "selesai";
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

  // Date range default: 30 hari terakhir
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  const defaultEnd = localToday.toISOString().slice(0, 10);
  const defaultStart = new Date(localToday);
  defaultStart.setDate(defaultStart.getDate() - 29);
  const defaultStartStr = defaultStart.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStartStr);
  const [endDate, setEndDate] = useState(defaultEnd);

  // === Ambil token dari Redux atau localStorage ===
  const reduxToken = useSelector((s) => s?.auth?.token);
  const storedToken =
    typeof window !== "undefined"
      ? localStorage.getItem("auth_token") || localStorage.getItem("token")
      : null;
  const token = reduxToken || storedToken || null;

  // Header auth konsisten dengan /api/auth/me (Bearer). withCredentials true biar cookie HttpOnly ikut kalau kamu pakai cookie.
  const axiosAuthConfig = {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  };

  // === Cek autentikasi via /api/auth/me ===
  const checkAuth = async () => {
    setAuthLoading(true);
    setError("");
    try {
      const { data } = await axios.get("http://localhost:3000/api/auth/me", axiosAuthConfig);
      setMe(data?.user || null);
    } catch (e) {
      console.error(e);
      setMe(null);
      setError("Unauthorized. Silakan login terlebih dahulu.");
    } finally {
      setAuthLoading(false);
    }
  };

  // === Ambil data order ===
  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      // GANTI URL BERIKUT sesuai endpoint order kamu jika berbeda
      const { data } = await axios.post(
        "http://localhost:3000/api/orders/list",
        { limit: 5000, offset: 0 },
        axiosAuthConfig
      );
      setOrders(normalize(data));
    } catch (e) {
      console.error(e);
      setError("Gagal mengambil data order");
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
      const cur = map.get(key) || { date: key, omzet: 0, count: 0 };
      cur.omzet += Number(o.total_harga || 0);
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [filtered]);

  const customerSeries = useMemo(() => {
    const map = new Map();
    filtered.forEach((o) => {
      const key = o.name || "—";
      const cur = map.get(key) || { customer: key, omzet: 0, count: 0 };
      cur.omzet += Number(o.total_harga || 0);
      cur.count += 1;
      map.set(key, cur);
    });
    const arr = Array.from(map.values()).sort((a, b) => b.omzet - a.omzet);
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
        (acc, r) => ({ omzet: acc.omzet + Number(r.total_harga || 0), count: acc.count + 1 }),
        { omzet: 0, count: 0 }
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
      { label: "Kode Transaksi", key: "code_trx" },
      { label: "Tanggal", key: "tanggal" },
      { label: "Customer", key: "name" },
      { label: "Total Harga", key: "total_harga" },
      { label: "Status", value: (r) => statusText(r.status) },
    ];
    downloadCSV(`orders_${Date.now()}.csv`, filtered, cols);
  };

  const exportDailyCSV = () => {
    if (!dailySeries.length) return;
    const cols = [
      { label: "Tanggal", key: "date" },
      { label: "Order Count", key: "count" },
      { label: "Omzet", key: "omzet" },
    ];
    downloadCSV(`daily_${Date.now()}.csv`, dailySeries, cols);
  };

  // ====== UI ======
  return (
    <section className="section">
      <div className="container">
        {/* Header */}
        <nav className="level">
          <div className="level-left">
            <div>
              <h1 className="title">Grafik Penjualan</h1>
              <p className="subtitle is-6">Analitik order berdasarkan periode</p>
            </div>
          </div>
          <div className="level-right">
            <div className="field has-addons">
              <p className="control is-expanded">
                <input
                  className="input"
                  type="text"
                  placeholder="Cari (kode/customer/angka)..."
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
                  Menampilkan <strong>{filtered.length}</strong> order. Total omzet: <strong>{toRupiah(totals.omzet)}</strong>
                </div>
              </article>
            </div>
          </div>
        </div>

        {/* Alerts / Loader */}
        {error && <div className="notification is-danger is-light">{error}</div>}
        {loading || authLoading ? (
          <progress className="progress is-small is-primary" max="100">Loading…</progress>
        ) : null}

        {/* Charts */}
        <div className="columns is-multiline">
          {/* Line: Omzet per Hari */}
          <div className="column is-12">
            <div className="card">
              <header className="card-header">
                <p className="card-header-title">Omzet per Hari</p>
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
                          return dt ? dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : d;
                        }}
                      />
                      <YAxis tickFormatter={(v) => (v >= 1000000 ? `${v / 1000000}jt` : v >= 1000 ? `${v / 1000}k` : v)} />
                      <Tooltip formatter={(value, name) => [name === "omzet" ? toRupiah(value) : value, name]} />
                      <Legend />
                      <Line type="monotone" dataKey="omzet" name="Omzet" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="count" name="Jumlah Order" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="has-text-grey">Tidak ada data pada rentang tanggal ini.</p>
                )}
              </div>
            </div>
          </div>

          {/* Bar: Top Customer */}
          <div className="column is-12">
            <div className="card">
              <header className="card-header">
                <p className="card-header-title">Top Customer (by Omzet)</p>
              </header>
              <div className="card-content" style={{ height: 360 }}>
                {customerSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customerSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="customer" interval={0} angle={-15} textAnchor="end" height={70} />
                      <YAxis tickFormatter={(v) => (v >= 1000000 ? `${v / 1000000}jt` : v >= 1000 ? `${v / 1000}k` : v)} />
                      <Tooltip formatter={(value) => toRupiah(value)} />
                      <Legend />
                      <Bar dataKey="omzet" name="Omzet" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="has-text-grey">Belum ada data customer pada rentang ini.</p>
                )}
              </div>
            </div>
          </div>

          {/* Pie: Status Order */}
          <div className="column is-6">
            <div className="card">
              <header className="card-header">
                <p className="card-header-title">Distribusi Status</p>
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
                  <p className="has-text-grey">Tidak ada data status.</p>
                )}
              </div>
            </div>
          </div>

          {/* Table ringkas per hari */}
          <div className="column is-6">
            <div className="card">
              <header className="card-header">
                <p className="card-header-title">Ringkasan Harian</p>
              </header>
              <div className="card-content">
                <div className="table-container">
                  <table className="table is-fullwidth is-striped is-hoverable is-narrow">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th className="has-text-right">Order</th>
                        <th className="has-text-right">Omzet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySeries.length ? (
                        dailySeries.map((r) => (
                          <tr key={r.date}>
                            <td>{new Date(r.date).toLocaleDateString("id-ID")}</td>
                            <td className="has-text-right">{r.count}</td>
                            <td className="has-text-right">{toRupiah(r.omzet)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="has-text-centered has-text-grey">
                            Tidak ada data
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
                            {toRupiah(dailySeries.reduce((a, b) => a + b.omzet, 0))}
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

        {/* Footer kecil */}
        <p className="has-text-grey is-size-7" style={{ marginTop: 12 }}>
          Sumber data: <code>POST /api/orders/list</code> (client-side filter by date)
        </p>
      </div>
    </section>
  );
}
