// src/components/Sidebar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, reset, getMe } from "../features/authSlice";

// Icons
import {
  IoHome,
  IoSearch,
  IoStorefront,
  IoPricetag,
  IoCart,
  IoSettingsOutline,
  IoHelpCircleOutline,
  IoPersonCircle,
  IoLogOut,
} from "react-icons/io5";

import "./Sidebar.css";

const ROLE_BY_ID = { 1: "MEMBER", 2: "VENDOR", 3: "AFFILIATE", 4: "ADMIN" };

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading } = useSelector((s) => s.auth);
  const [q, setQ] = useState("");

  // Ensure profile is loaded when a token exists
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token && !user && !isLoading) {
      dispatch(getMe());
    }
  }, [dispatch, user, isLoading]);

  const logout = () => {
    dispatch(LogOut());
    dispatch(reset());
    navigate("/");
  };

  // Resolve role safely
  const role = useMemo(() => {
    if (user && user.role) return String(user.role).toUpperCase();
    if (user && user.role_id && ROLE_BY_ID[Number(user.role_id)]) {
      return ROLE_BY_ID[Number(user.role_id)];
    }
    return "GUEST";
  }, [user]);
  console.log(role);
  const nameOrEmail = user?.name || user?.email || "User";

  const roleClass =
    role === "ADMIN" ? "chip chip--danger" : role === "VENDOR" ? "chip chip--info" : "chip";

  const navClass = ({ isActive }) => `sb__link ${isActive ? "is-active" : ""}`;

  // Define menus then filter by role
  const ALL_MENUS = useMemo(
    () => [
      // Everyone (including guest)
      { key: "dashboard", to: "/dashboard", label: "Dashboard", icon: IoHome, roles: ["ADMIN", "VENDOR", "MEMBER", "AFFILIATE", "GUEST"] },

      // Vendor module
      { key: "vendors", to: "/vendors", label: "Vendor", icon: IoStorefront, roles: ["ADMIN", "VENDOR"] },

      // Member module
      { key: "member", to: "/member", label: "Member", icon: IoStorefront, roles: ["ADMIN", "MEMBER"] },

      // Affiliate module
      { key: "affiliate", to: "/affiliate", label: "Affiliate", icon: IoStorefront, roles: ["ADMIN", "AFFILIATE"] },
      { key: "affiliate-commission", to: "/affiliate-commision", label: "Affiliate Commission", icon: IoStorefront, roles: ["ADMIN", "AFFILIATE"] },

      // Products / vouchers
      { key: "projects", to: "/projects", label: "Product / Voucher", icon: IoPricetag, roles: ["ADMIN", "VENDOR"] },

      // Orders
      { key: "transactions", to: "/transactions", label: "Orders", icon: IoCart, roles: ["ADMIN", "VENDOR", "MEMBER"] },
    ],
    []
  );

  const visibleMenus = useMemo(() => {
    if (role === "ADMIN") return ALL_MENUS;
    return ALL_MENUS.filter((m) => m.roles.includes(role));
  }, [role, ALL_MENUS]);

  // Optional: small placeholder while loading profile
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const isBootLoading = token && !user && isLoading;

  return (
    <aside className="sb">
      {/* Search */}
      <div className="sb__search">
        <IoSearch className="sb__searchIcon" />
        <input
          className="sb__searchInput"
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigate(`/search?q=${encodeURIComponent(q)}`);
          }}
        />
      </div>

      {/* Account */}
      <div className="sb__account">
        <IoPersonCircle className="sb__avatar" />
        <div className="sb__accountInfo">
          <div className="sb__accountName">
            {isBootLoading ? "Loading…" : nameOrEmail}
          </div>
          <span className={roleClass}>Role: {isBootLoading ? "…" : role}</span>
        </div>
      </div>

      {/* Main Menu */}
      <div className="sb__sectionTitle">Main Menu</div>
      <nav className="sb__nav">
        {visibleMenus.map(({ key, to, label, icon: Icon }) => (
          <NavLink key={key} to={to} className={navClass}>
            <Icon /> <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="sb__footer">
        <NavLink to="/settings" className={navClass}>
          <IoSettingsOutline /> <span>Settings</span>
        </NavLink>
        <NavLink to="/help" className={navClass}>
          <IoHelpCircleOutline /> <span>Help Center</span>
        </NavLink>

        <button className="sb__logout" onClick={logout}>
          <IoLogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
