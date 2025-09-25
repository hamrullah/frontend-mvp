// src/components/Navbar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, reset } from "../features/authSlice";
import logo from "../logo.png";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);

  const logout = () => {
    dispatch(LogOut());
    dispatch(reset());
    navigate("/");
  };

  const displayName = user?.name || user?.email || "User";
  const role = (user?.role || "GUEST").toUpperCase();
  const roleTag =
    role === "ADMIN" ? "tag is-danger is-light is-rounded" : "tag is-info is-light is-rounded";

  return (
    <nav className="navbar is-fixed-top has-shadow is-white" role="navigation" aria-label="main navigation">
      {/* Brand */}
      <div className="navbar-brand">
        <NavLink to="/dashboard" className="navbar-item">
          
         <span className="ml-2">
          <strong className="has-text-danger">ALIMAS</strong>{" "}
          <span className="has-text-grey">Admin</span>
        </span>
        </NavLink>

        {/* Burger */}
        <button
          type="button"
          className={`navbar-burger ${open ? "is-active" : ""}`}
          aria-label="menu"
          aria-expanded={open ? "true" : "false"}
          data-target="mainNavbar"
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      {/* Menu */}
      <div id="mainNavbar" className={`navbar-menu ${open ? "is-active" : ""}`}>
        <div className="navbar-start">{/* tempat breadcrumb / search kalau dibutuhkan */}</div>

        <div className="navbar-end">
          <div className="navbar-item">
            <div className="is-flex is-align-items-center">
              {/* Avatar kecil (inisial) + info */}
              <div
                className="has-text-weight-semibold is-size-6 mr-3"
                style={{ lineHeight: 1.1, textAlign: "right" }}
              >
                {displayName}
                <div className="mt-1">
                  <span className={roleTag}>Role: {role}</span>
                </div>
              </div>

              <div
                className="has-background-grey-lighter has-text-grey-dark is-flex is-justify-content-center is-align-items-center"
                style={{ width: 34, height: 34, borderRadius: "50%", fontWeight: 700 }}
              >
                {(displayName || "U").charAt(0).toUpperCase()}
              </div>

              <button onClick={logout} className="button is-light ml-4">Log out</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
