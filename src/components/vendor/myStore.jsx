import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  IoShareSocialOutline,
  IoMapOutline,
  IoLogoTwitter,
  IoLogoInstagram,
  IoLogoTiktok,
} from "react-icons/io5";

const PROFILE_URL = "https://backend-mvp-nine.vercel.app/api/profile";

// Iframe default (fallback) — ganti ke alamat/koordinat toko kalau ada
const MAP_IFRAME_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d497134.2475964974!2d101.63787592286111!3d3.3104162821297303!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3034d3975f6730af%3A0x745969328211cd8!2sMalaysia!5e0!3m2!1sen!2sid!4v1759471370077!5m2!1sen!2sid";

const toAddressLine = (p) => {
  if (!p) return "-";
  const parts = [p.address, p.city, p.province].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
};

const fallbackPics = [
  "https://images.unsplash.com/photo-1556125574-d7f27ec36a06?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571907480495-6c4b8b35e3b1?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600607687920-4ceaa3ea0eb3?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200&auto=format&fit=crop",
];

export default function MyStore() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const loadProfile = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await axios.get(PROFILE_URL, {
        headers: { ...authHeader, "Content-Type": "application/json" },
      });
      const p = data?.profileType === "Vendor" ? data?.profile : null;
      const normalized = p
        ? {
            id: p.id,
            name: p.name || p.name_vendor || p.name_admin || "My Store",
            email: p.email || "-",
            code_vendor: p.code_vendor,
            address: p.address || "",
            city: p.city || "",
            province: p.province || "",
            postal_code: p.postal_code || "",
            image_url: p.image || null,
            twitter: p.twitter || "",
            instagram: p.instagram || "",
            tiktok: p.tiktok || "",
            created_at: p.created_at,
            updated_at: p.updated_at,
          }
        : null;

      if (!normalized)
        throw new Error("This account doesn’t have a vendor profile.");
      setStore(normalized);
    } catch (e) {
      console.error(e);
      setErr(
        e?.response?.data?.error || e?.message || "Failed to load profile"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photos = useMemo(() => {
    const main = store?.image_url ? [store.image_url] : [];
    return [...main, ...fallbackPics].slice(0, 5);
  }, [store]);

  const initial = (store?.name || "S").trim().charAt(0).toUpperCase();

  const mapsSearchUrl = useMemo(() => {
    const q = toAddressLine(store);
    const query = q && q !== "-" ? encodeURIComponent(q) : "Malaysia";
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [store]);

  const handleOpenMaps = () => {
    window.open(mapsSearchUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="section mystore-page">
      <style>{styles}</style>

      <div className="card soft-card">
        <div className="card-content card-pad">
          <h1 className="title is-6 mb-2">My Store</h1>

          {/* === MAP BANNER === */}
          <div className="map-hero">
            <iframe
              src={MAP_IFRAME_SRC}
              title="Store location map"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="map-gradient" />
            <div className="brand-pill" title="logo">
              {store?.image_url ? (
                <img src={store.image_url} alt="logo" />
              ) : (
                <span className="initial">{initial}</span>
              )}
            </div>
          </div>

          {/* === HEADER & ACTIONS === */}
          <div className="store-head">
            <div className="store-info">
              <h2 className="store-name">{store?.name || "—"}</h2>
              <div className="store-address">{toAddressLine(store)}</div>

              <div className="store-links">
                {store?.twitter ? (
                  <a href={store.twitter} target="_blank" rel="noreferrer">
                    <IoLogoTwitter /> {store.twitter}
                  </a>
                ) : null}
                {store?.tiktok ? (
                  <a href={store.tiktok} target="_blank" rel="noreferrer">
                    <IoLogoTiktok /> {store.tiktok}
                  </a>
                ) : null}
                {store?.instagram ? (
                  <a href={store.instagram} target="_blank" rel="noreferrer">
                    <IoLogoInstagram /> {store.instagram}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="store-actions">
              <button className="chip-pink" title="Share">
                <IoShareSocialOutline />
              </button>
              <button className="chip-pink" title="Open Maps" onClick={handleOpenMaps}>
                <IoMapOutline />
              </button>
            </div>
          </div>

          {/* Loading / error */}
          {loading && (
            <progress className="progress is-small is-primary mt-3" max="100">
              Loading…
            </progress>
          )}
          {err && (
            <div className="notification is-danger is-light mt-3">{err}</div>
          )}

          {/* === GALLERY (seperti screenshot) === */}
          <div className="gallery">
            {/* kiri besar */}
            <div className="photo main">
              <img src={photos[0]} alt="main" />
            </div>

            {/* kanan 4 tile */}
            {photos.slice(1, 5).map((src, i) => {
              const isSeeAll = i === 3;
              return (
                <div
                  className={`photo thumb ${isSeeAll ? "seeall" : ""}`}
                  key={src}
                >
                  <img src={src} alt={`photo-${i + 1}`} />
                  {isSeeAll && <span className="seeall-pill">See All Photos</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====== STYLES ====== */
const styles = `
.card-pad{ padding: 18px 18px 22px 18px; }
.mystore-page .soft-card {
  border: 1px solid #eceff4;
  border-radius: 14px;
  box-shadow: 0 6px 26px rgba(20,20,43,.06);
}

/* MAP hero */
.map-hero{
  height: 220px;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  margin-bottom: 10px;
}
.map-hero iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; }
.map-gradient{
  position:absolute; inset:0;
  background: linear-gradient(180deg, rgba(255,255,255,0) 60%, rgba(255,255,255,.85) 100%);
  pointer-events:none;
}
.brand-pill{
  position:absolute; left:18px; bottom:14px;
  width:56px; height:56px; border-radius:50%;
  background:#fff; border:1px solid #e7eaf0;
  display:flex; align-items:center; justify-content:center; overflow:hidden;
  box-shadow:0 10px 22px rgba(20,20,43,.16);
}
.brand-pill img{ width:100%; height:100%; object-fit:cover; }
.brand-pill .initial{
  width:100%; height:100%;
  display:flex; align-items:center; justify-content:center;
  font-weight:800; font-size:1.05rem; color:#ef4444;
}

/* Header */
.store-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-top:6px; }
.store-info .store-name{ font-size:1.25rem; font-weight:800; margin-bottom:4px; }
.store-address{ color:#6b7280; margin-bottom:8px; }
.store-links{ display:flex; flex-direction:column; gap:6px; }
.store-links a{
  display:flex; align-items:center; gap:8px; color:#2563eb; text-decoration:underline;
}
.store-actions{ display:flex; gap:10px; }
.chip-pink{
  display:inline-flex; align-items:center; justify-content:center;
  width:36px; height:36px; border-radius:12px;
  background:#ffe7f3; border:1px solid #ffd1e6; color:#ff4f98;
  box-shadow:0 6px 14px rgba(255, 79, 152, .12);
}
.chip-pink:hover{ background:#ffdff0; }

/* Gallery: 1 kolom besar + 2 kolom kecil (2 baris) */
.gallery{
  display:grid;
  grid-template-columns: 1.6fr .9fr .9fr;  /* kiri besar + 2 kol kecil */
  grid-auto-rows: 160px;
  gap:12px; margin-top:14px;
}
.photo{ position:relative; overflow:hidden; border-radius:12px; background:#f3f5f9; }
.photo img{ width:100%; height:100%; object-fit:cover; display:block; }
.main{ grid-column:1 / span 1; grid-row:1 / span 3; } /* tinggi 3 baris */
.thumb:nth-of-type(1){ grid-column:2; grid-row:1; }
.thumb:nth-of-type(2){ grid-column:3; grid-row:1; }
.thumb:nth-of-type(3){ grid-column:2; grid-row:2; }
.thumb:nth-of-type(4){ grid-column:3; grid-row:2; } /* see all */
.photo.seeall::after{
  content:""; position:absolute; inset:0;
  background:linear-gradient(0deg, rgba(0,0,0,.38), rgba(0,0,0,.05));
}
.seeall-pill{
  position:absolute; bottom:10px; left:10px;
  background:#fff; color:#111827; border-radius:9999px; padding:6px 10px;
  font-weight:600; font-size:.85rem; display:inline-block;
  box-shadow:0 6px 16px rgba(20,20,43,.18);
}

/* Responsive */
@media (max-width: 820px){
  .gallery{ grid-template-columns: 1fr 1fr; grid-auto-rows: 150px; }
  .main{ grid-column:1 / span 2; grid-row:1 / span 1; height:220px; }
  .thumb:nth-of-type(1){ grid-column:1; grid-row:2; }
  .thumb:nth-of-type(2){ grid-column:2; grid-row:2; }
  .thumb:nth-of-type(3){ grid-column:1; grid-row:3; }
  .thumb:nth-of-type(4){ grid-column:2; grid-row:3; }
}
`;
