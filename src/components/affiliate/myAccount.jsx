// src/pages/AffiliateAccount.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  IoCalendarOutline,
  IoCallOutline,
  IoMailOutline,
  IoLinkOutline,
  IoCopyOutline,
  IoCheckmarkCircleOutline,
} from "react-icons/io5";

const PROFILE_URL = "https://backend-mvp-nine.vercel.app/api/profile";
const SITE_BASE = process.env.NEXT_PUBLIC_SITE_BASE || "https://alimas.my";

const fmtDate = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace("Sep", "Aug" === "Aug" ? "Aug" : "Sept"); // kecil tweak untuk "Sept"
};

export default function AffiliateAccount() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  const token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await axios.get(PROFILE_URL, {
          headers: { ...authHeader, "Content-Type": "application/json" },
        });

        const a =
          data?.profileType?.toLowerCase?.() === "affiliate"
            ? data.profile
            : data?.profile?.affiliate || data?.affiliate || data?.profile;

        if (!a) throw new Error("Affiliate profile not found.");

        setMe({
          name: a.name || a.name_affiliate || "Michael Shirmon",
          email: a.email || "Michael@gmail.com",
          phone: a.phone || a.phone_number || "+62 8192 8273 2927",
          joined_at: a.created_at || new Date().toISOString(),
          image_url: a.image || null,
          level: a.level || 1,
          referral_code: a.referral_code || "PARTNER789",
        });
      } catch (e) {
        setErr(e?.response?.data?.error || e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const affiliateLink = useMemo(() => {
    const code = me?.referral_code || "PARTNER789";
    return `${SITE_BASE}/affiliate?ref=${encodeURIComponent(code)}`;
  }, [me]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const initial = (me?.name || "A").trim().charAt(0).toUpperCase();

  return (
    <section className="aff-page">
      <style>{css}</style>

      {/* ===== HERO (persis feel mockup) ===== */}
      <div className="hero">
        <div className="hero-bg" />
      </div>

      {/* ===== BODY (konten utama) ===== */}
      <div className="body">
        <br></br>
        <br></br>
        <br></br>
        <br></br>
        <br></br>
        <div className="container">
          <div className="grid">
            {/* LEFT: profile */}
            <div className="left">
              <div className="profile">
                <div className="avatar">
                  {me?.image_url ? (
                    <img src="/aqw.png"alt="avatar" />
                  ) : (
                    <span className="letter">{initial}</span>
                  )}
                </div>

                <div className="who">
                  <h2 className="name">{me?.name || "—"}</h2>
                  <span className="level">Level {me?.level ?? 1}</span>
                </div>

                {loading && (
                  <progress className="progress is-small is-primary" max="100">
                    Loading…
                  </progress>
                )}
                {err && <div className="note danger">{err}</div>}

                <ul className="facts">
                  <li>
                    <IoCalendarOutline /> Joined at {fmtDate(me?.joined_at)}
                  </li>
                  <li>
                    <IoCallOutline /> {me?.phone || "—"}
                  </li>
                  <li>
                    <IoMailOutline /> {me?.email || "—"}
                  </li>
                </ul>
              </div>
            </div>

            {/* RIGHT: code card */}
            <div className="right">
              <div className="code-card">
                <h3>Your Affiliate Code</h3>
                <p className="sub">
                  Share your unique link. earn commissions on every referral.
                </p>

                <div className="input-row">
                  <div className="pill">
                    <IoLinkOutline />
                    <span className="url" title={affiliateLink}>
                      {affiliateLink}
                    </span>
                  </div>

                  <button className="copy" onClick={copyLink}>
                    {copied ? <IoCheckmarkCircleOutline /> : <IoCopyOutline />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 28 }} />
          <br></br>
          <br></br>
          <br></br>
        </div>
      </div>
    </section>
  );
}

/* ====== CSS: disetel untuk match screenshot ====== */
const css = `
:root{
  --ink:#0f172a;
  --muted:#6b7280;
  --line:#e6e9ef;
  --border:#e7eaf0;
  --pink:#ff2d87;
}

/* layout */
.aff-page{ background:#fff; }
.container{ max-width: 1120px; margin: 0 auto; padding: 0 20px; }

/* hero  */
.hero{ height: 220px; position:relative; overflow:hidden; }
.hero-bg{
  position:absolute; inset:0;
  background:
    radial-gradient(1200px 300px at -80px -20px, #ffa94d 0%, transparent 60%),
    radial-gradient(500px 300px at 80% 0%, #ff5aa1 0%, transparent 70%),
    linear-gradient(90deg, #FA056B 0%, #FF7D7F 45%, #E6BD6B 100%);
}

/* body */
.body{ padding: 34px 0 24px; }
.grid{
  display:grid;
  grid-template-columns: 380px 1fr;
  gap: 36px;
}

/* left */
.profile{
  padding-left: 6px;
}
.avatar{
  width:72px; height:72px; border-radius:50%; overflow:hidden;
  box-shadow: 0 10px 22px rgba(20,20,43,.10);
}
.avatar img{ width:100%; height:100%; object-fit:cover; }
.letter{ width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-weight:800; color:#fff; background:#ff7d7f; }
.who{ display:flex; align-items:center; gap:14px; margin-top:14px; }
.name{ font-weight:800; font-size:24px; color:var(--ink); margin:0; }
.level{
  background:#ffe7f3; color:#ff2d87; border:1px solid #ffd1e6;
  padding:6px 12px; border-radius:9999px; font-size:12px; font-weight:800;
}
.facts{ list-style:none; margin:16px 0 0; padding:0; display:flex; flex-direction:column; gap:10px; color:#6b7280; }
.facts li{ display:flex; align-items:center; gap:10px; }

/* right */
.code-card{
  border:1px solid var(--line);
  border-radius:18px;
  padding:24px 28px;
  box-shadow: 0 8px 24px rgba(20,20,43,.06);
  background:#fff;
}
.code-card h3{ margin:0 0 8px; font-size:20px; font-weight:800; color:var(--ink); }
.code-card .sub{ margin:0 0 18px; color:var(--muted); }

.input-row{ display:flex; align-items:center; gap:14px; }
.pill{
  flex:1 1 auto;
  display:flex; align-items:center; gap:10px;
  padding:12px 14px;
  border:1px solid #e3e7ef;
  border-radius:12px;
  background:#f7f9ff;
  color:#1e40af;
  font-weight:700;
  overflow:hidden;
}
.pill .url{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.copy{
  display:inline-flex; align-items:center; gap:8px;
  background:var(--pink); color:#fff; border:none; cursor:pointer;
  border-radius:12px; padding:12px 18px; font-weight:800;
  box-shadow: 0 12px 22px rgba(255,45,135,.25);
}
.copy:hover{ filter:brightness(.98); }

/* responsive */
@media (max-width: 980px){
  .grid{ grid-template-columns: 1fr; }
}
`;
