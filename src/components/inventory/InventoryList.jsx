import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost/backend-mkn/Api_v1";
const RESOURCE = "Login";

const InventoryList = () => {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal tambah stok
  const [stokModalOpen, setStokModalOpen] = useState(false);
  const [stokTarget, setStokTarget] = useState(null); // row item
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);

  // Auth: tanpa "Bearer" mengikuti backend-mu
  const token = localStorage.getItem("token") || "YOUR_ACCESS_TOKEN";
  const authHeaders = { Authorization: `${token}`, "Content-Type": "application/json" };

  const normalize = (data) =>
    Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

  const toRupiah = (n) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
      .format(Number(n || 0));

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await axios.post(
        `${API_BASE}/${RESOURCE}/listInventory`,
        { limit: 10, offset: 0 },
        { headers: authHeaders }
      );
      setRows(normalize(data));
    } catch (e) {
      console.error(e);
      setError("Gagal mengambil data inventory");
    } finally {
      setLoading(false);
    }
  };

  const openTambahStok = (row) => {
    setStokTarget(row);
    setQty("");
    setStokModalOpen(true);
  };

  const submitTambahStok = async () => {
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) {
      alert("Qty harus bilangan bulat > 0");
      return;
    }
    if (!stokTarget?.barang_id) {
      alert("Barang tidak diketahui");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await axios.post(
        `${API_BASE}/${RESOURCE}/addStokBarang`,
        { barang_id: Number(stokTarget.barang_id), qty: n },
        { headers: authHeaders }
      );
      setStokModalOpen(false);
      setSuccess("Stok berhasil ditambahkan.");
      await fetchInventory(); // refresh agar angka akurat
    } catch (e) {
      console.error(e);
      setError("Gagal menambahkan stok.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((x) =>
      [x.code_barang, x.nama_barang, x.sku, x.harga, x.stok_awal, x.terjual, x.sisa_stok]
        .map((v) => (v === null || v === undefined ? "" : String(v)))
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        const harga = Number(r.harga || 0);
        const stokAwal = Number(r.stok_awal || 0);
        const terjual = Number(r.terjual || 0);
        const sisa = Number(r.sisa_stok || 0);
        acc.stok_awal += stokAwal;
        acc.terjual += terjual;
        acc.sisa_stok += sisa;
        acc.nilai += sisa * harga; // nilai persediaan sisa
        return acc;
      },
      { stok_awal: 0, terjual: 0, sisa_stok: 0, nilai: 0 }
    );
  }, [filtered]);

  return (
    <section className="section">
      <div className="container">
        {/* Header + Toolbar */}
        <nav className="level">
          <div className="level-left">
            <div>
              <h1 className="title">Inventory</h1>
              <p className="subtitle is-6">List of Inventory</p>
            </div>
          </div>
          <div className="level-right">
            <div className="field has-addons">
              <p className="control is-expanded">
                <input
                  className="input"
                  type="text"
                  placeholder="Cari (kode/nama/SKU)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </p>
              <p className="control">
                <button className="button" onClick={fetchInventory}>
                  Refresh
                </button>
              </p>
            </div>
          </div>
        </nav>

        {/* Alerts / Loader */}
        {error && <div className="notification is-danger is-light">{error}</div>}
        {success && <div className="notification is-success is-light">{success}</div>}
        {loading && (
          <progress className="progress is-small is-primary" max="100">
            Loading…
          </progress>
        )}

        {/* Card + Table */}
        <div className="card">
          <div className="card-content">
            <div className="table-container">
              <table className="table is-fullwidth is-striped is-hoverable">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>No</th>
                    <th>Kode</th>
                    <th>Nama Barang</th>
                    <th>SKU</th>
                    <th className="has-text-right">Harga</th>
                    <th className="has-text-right">Stok Awal</th>
                    <th className="has-text-right">Terjual</th>
                    <th className="has-text-right">Sisa Stok</th>
                    <th style={{ width: 150 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length ? (
                    filtered.map((item, idx) => (
                      <tr key={item.barang_id}>
                        <td>{idx + 1}</td>
                        <td className="has-text-weight-medium">{item.code_barang}</td>
                        <td>{item.nama_barang}</td>
                        <td>{item.sku ?? "—"}</td>
                        <td className="has-text-right">{toRupiah(item.harga)}</td>
                        <td className="has-text-right">{Number(item.stok_awal ?? 0)}</td>
                        <td className="has-text-right">{Number(item.terjual ?? 0)}</td>
                        <td className="has-text-right">{Number(item.sisa_stok ?? 0)}</td>
                      
                        <td>
                          <div className="buttons are-small">
                            <button
                              className="button is-primary is-light"
                              onClick={() => openTambahStok(item)}
                            >
                              Tambah Stok
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="has-text-centered">
                        <p className="has-text-grey">Tidak ada data</p>
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Totals */}
                {filtered.length > 0 && (
                  <tfoot>
                    <tr>
                      <th colSpan={5} className="has-text-right">TOTAL</th>
                      <th className="has-text-right">{totals.stok_awal}</th>
                      <th className="has-text-right">{totals.terjual}</th>
                      <th className="has-text-right">{totals.sisa_stok}</th>
                      <th />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {!loading && (
              <p className="has-text-grey is-size-7">
                Menampilkan {filtered.length} dari {rows.length} data
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Tambah Stok */}
      <div className={`modal ${stokModalOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setStokModalOpen(false)} />
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Tambah Stok</p>
            <button className="delete" aria-label="close" onClick={() => setStokModalOpen(false)} />
          </header>
          <section className="modal-card-body">
            {stokTarget && (
              <div className="content">
                <p>
                  <strong>{stokTarget.code_barang}</strong> — {stokTarget.nama_barang}
                </p>
              </div>
            )}
            <div className="field">
              <label className="label">Qty</label>
              <div className="control">
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Masukkan jumlah"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitTambahStok();
                  }}
                />
              </div>
              <p className="help">Hanya bilangan bulat &gt; 0</p>
            </div>
          </section>
          <footer className="modal-card-foot is-justify-content-flex-end">
            <button className="button" onClick={() => setStokModalOpen(false)}>
              Cancel
            </button>
            <button className={`button is-primary ${saving ? "is-loading" : ""}`} onClick={submitTambahStok} disabled={saving}>
              Tambahkan
            </button>
          </footer>
        </div>
      </div>
    </section>
  );
};

export default InventoryList;
