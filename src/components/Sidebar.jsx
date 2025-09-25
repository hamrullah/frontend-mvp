import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, reset } from "../features/authSlice";

// Icons
import {
  IoHome,
  IoSearch,
  IoStorefront,
  IoPricetag,
  IoCart,
  IoWallet,
  IoDocumentText,
  IoSettingsOutline,
  IoHelpCircleOutline,
  IoPersonCircle,
  IoLogOut,
} from "react-icons/io5";

import "./Sidebar.css";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [q, setQ] = useState("");

  const logout = () => {
    dispatch(LogOut());
    dispatch(reset());
    navigate("/");
  };

  const role = (user?.role || user?.role_id || "GUEST")?.toString().toUpperCase();
  const nameOrEmail = user?.name || user?.email || "User";

  const roleClass =
    role === "ADMIN"
      ? "chip chip--danger"
      : role === "VENDOR"
      ? "chip chip--info"
      : "chip";

  const navClass = ({ isActive }) =>
    `sb__link ${isActive ? "is-active" : ""}`;

  return (
    <aside className="sb">
      {/* Brand / Header */}
    

      {/* Search */}
      <div className="sb__search">
        <IoSearch className="sb__searchIcon" />
        <input
          className="sb__searchInput"
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              navigate(`/search?q=${encodeURIComponent(q)}`);
            }
          }}
        />
      </div>

      {/* Account */}
      <div className="sb__account">
        <IoPersonCircle className="sb__avatar" />
        <div className="sb__accountInfo">
          <div className="sb__accountName">{nameOrEmail}</div>
          <span className={roleClass}>Role: {role}</span>
        </div>
      </div>

      {/* Main Menu */}
      <div className="sb__sectionTitle">Main Menu</div>
      <nav className="sb__nav">
        <NavLink to="/dashboard" className={navClass}>
          <IoHome /> <span>Dashboard</span>
        </NavLink>

        <NavLink to="/vendors" className={navClass}>
          <IoStorefront /> <span>Vendor</span>
        </NavLink>

         <NavLink to="/member" className={navClass}>
          <IoStorefront /> <span>Member</span>
        </NavLink>

         <NavLink to="/affiliate" className={navClass}>
          <IoStorefront /> <span>Affiliate</span>
        </NavLink>

          <NavLink to="/affiliate-commision" className={navClass}>
          <IoStorefront /> <span>Affiliate Commision</span>
        </NavLink>

        <NavLink to="/projects" className={navClass}>
          <IoPricetag /> <span>Product / Voucher</span>
        </NavLink>

        <NavLink to="/transactions" className={navClass}>
          <IoCart /> <span>Orders</span>
        </NavLink>

        {/* <NavLink to="/payouts" className={navClass}>
          <IoWallet /> <span>Payout</span>
        </NavLink>

        <NavLink to="/reports" className={navClass}>
          <IoDocumentText /> <span>Report / Log</span>
        </NavLink> */}
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
