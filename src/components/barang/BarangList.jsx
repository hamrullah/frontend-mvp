import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost/backend-mkn/Api_v1";
const RESOURCE = "Login"; // ganti jika controllernya beda

const BarangList = () => {
  const [rows, setRows] = useState([]);
  const [lokasiOptions, setLokasiOptions] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("add"); // 'add' | 'edit'
  const [current, setCurrent] = useState({
    id: null,
    nama_barang: "",
    sku: "",
    harga: "",
    lokasi_id: "",
  });
  const [deletingId, setDeletingId] = useState(null);

  // auth header: tanpa "Bearer" sesuai pola backend kamu
  const token = localStorage.getItem("token") || "YOUR_ACCESS_TOKEN";
  const authHeaders = { Authorization: `${token}`, "Content-Type": "application/json" };

  const normalize = (data) =>
    Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

  const toRupiah = (n) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
      .format(Number(n || 0));

  const lokasiLabel = (id) => {
    const o = lokasiOptions.find((x) => Number(x.id) === Number(id));
    return o ? `${o.code_lokasi} · ${o.nama_lokasi}` : (id ?? "—");
  };

  useEffect(() => {
    // load barang + dropdown lokasi sekaligus
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [barangRes, lokasiRes] = await Promise.all([
          axios.post(`${API_BASE}/${RESOURCE}/listBarang`, { limit: 10, offset: 0 }, { headers: authHeaders }),
          axios.post(`${API_BASE}/${RESOURCE}/listLokasiDropdown`, {}, { headers: authHeaders }),
        ]);
        setRows(normalize(barangRes.data));
        setLokasiOptions(normalize(lokasiRes.data));
      } catch (e) {
        console.error(e);
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBarang = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API_BASE}/${RESOURCE}/listBarang`,
        { limit: 10, offset: 0 },
        { headers: authHeaders }
      );
      setRows(normalize(data));
    } catch (e) {
      console.error(e);
      setError("Gagal mengambil data barang");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setMode("add");
    setCurrent({ id: null, nama_barang: "", sku: "", harga: "", lokasi_id: "" });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setMode("edit");
    setCurrent({
      id: row.id,
      nama_barang: row.nama_barang ?? "",
      sku: row.sku ?? "",
      harga: row.harga ?? "",
      lokasi_id: row.lokasi_id ?? "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!current.nama_barang.trim()) return alert("Nama barang tidak boleh kosong");
    try {
      const url =
        mode === "add"
          ? `${API_BASE}/${RESOURCE}/addBarang`
          : `${API_BASE}/${RESOURCE}/updateBarang`;

      const payload =
        mode === "add"
          ? {
              nama_barang: current.nama_barang,
              sku: current.sku,
              harga: current.harga === "" ? null : Number(current.harga),
              lokasi_id: current.lokasi_id === "" ? null : Number(current.lokasi_id),
            }
          : {
              id: current.id,
              nama_barang: current.nama_barang,
              sku: current.sku,
              harga: current.harga === "" ? null : Number(current.harga),
              lokasi_id: current.lokasi_id === "" ? null : Number(current.lokasi_id),
            };

      await axios.post(url, payload, { headers: authHeaders });
      setModalOpen(false);
      fetchBarang();
    } catch (e) {
      console.error(e);
      alert(mode === "add" ? "Gagal menambahkan barang" : "Gagal mengupdate barang");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Yakin ingin menghapus barang ini?")) return;
    try {
      setDeletingId(id);
      await axios.post(`${API_BASE}/${RESOURCE}/deleteBarang`, { id }, { headers: authHeaders });
      setRows((prev) => prev.filter((x) => x.id !== id)); // optimistik
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus barang");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = rows.filter((x) =>
    [x.code_barang, x.nama_barang, x.sku, x.harga, lokasiLabel(x.lokasi_id)]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const renderStatusTag = (s) => {
    if (Number(s) === 1) return <span className="tag is-success is-light">Active</span>;
    if (Number(s) === 0) return <span className="tag is-danger is-light">Inactive</span>;
    return <span className="tag is-warning is-light">—</span>;
  };

  return (
    <section className="section">
      <div className="container">
        {/* Header + Toolbar */}
        <nav className="level">
          <div className="level-left">
            <div>
              <h1 className="title">Barang</h1>
              <p className="subtitle is-6">List of Barang</p>
            </div>
          </div>
          <div className="level-right">
            <div className="field has-addons">
              <p className="control is-expanded">
                <input
                  className="input"
                  type="text"
                  placeholder="Cari barang (kode/nama/SKU/lokasi)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </p>
              <p className="control">
                <button className="button is-primary" onClick={openAdd}>
                  <span className="icon">+</span>
                  <span>Add Barang</span>
                </button>
              </p>
            </div>
          </div>
        </nav>

        {/* Alerts / Loader */}
        {error && <div className="notification is-danger is-light">{error}</div>}
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
                    <th>Lokasi</th>
                    <th>Harga</th>
                    <th>Status</th>
                    <th style={{ width: 190 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length ? (
                    filtered.map((item, idx) => (
                      <tr key={item.id}>
                        <td>{idx + 1}</td>
                        <td className="has-text-weight-medium">{item.code_barang}</td>
                        <td>{item.nama_barang}</td>
                        <td>{item.sku ?? "—"}</td>
                        <td>{lokasiLabel(item.lokasi_id)}</td>
                        <td>{toRupiah(item.harga)}</td>
                        <td>{renderStatusTag(item.status)}</td>
                        <td>
                          <div className="buttons are-small">
                            <button className="button is-info is-light" onClick={() => openEdit(item)}>
                              Edit
                            </button>
                            <button
                              className={`button is-danger ${deletingId === item.id ? "is-loading" : "is-light"}`}
                              onClick={() => remove(item.id)}
                              disabled={deletingId === item.id}
                            >
                              Delete
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

            {!loading && (
              <p className="has-text-grey is-size-7">
                Menampilkan {filtered.length} dari {rows.length} data
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <div className={`modal ${modalOpen ? "is-active" : ""}`}>
        <div className="modal-background" onClick={() => setModalOpen(false)} />
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">{mode === "add" ? "Add Barang" : "Edit Barang"}</p>
            <button className="delete" aria-label="close" onClick={() => setModalOpen(false)} />
          </header>
          <section className="modal-card-body">
            <div className="field">
              <label className="label">Nama Barang</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  placeholder="Nama Barang"
                  value={current.nama_barang}
                  onChange={(e) => setCurrent((p) => ({ ...p, nama_barang: e.target.value }))}
                />
              </div>
            </div>

            <div className="field is-horizontal">
              <div className="field-body">
                <div className="field">
                  <label className="label">SKU</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      placeholder="SKU"
                      value={current.sku}
                      onChange={(e) => setCurrent((p) => ({ ...p, sku: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Harga</label>
                  <div className="control">
                    <input
                      className="input"
                      type="number"
                      placeholder="Harga"
                      value={current.harga}
                      onChange={(e) => setCurrent((p) => ({ ...p, harga: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="label">Lokasi</label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select
                    value={current.lokasi_id === null ? "" : current.lokasi_id}
                    onChange={(e) => setCurrent((p) => ({ ...p, lokasi_id: e.target.value }))}
                  >
                    <option value="">— Pilih Lokasi —</option>
                    {lokasiOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.code_lokasi} — {opt.nama_lokasi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
          <footer className="modal-card-foot is-justify-content-flex-end">
            <button className="button" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="button is-primary" onClick={save}>
              {mode === "add" ? "Save" : "Update"}
            </button>
          </footer>
        </div>
      </div>
    </section>
  );
};

export default BarangList;
