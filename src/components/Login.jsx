import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LoginUser, getMe, reset } from "../features/authSlice";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isError, isSuccess, isLoading, message } = useSelector(
    (s) => s.auth
  );

  useEffect(() => {
    if (!isSuccess) return;
    const run = async () => {
      try {
        await dispatch(getMe()).unwrap();
        navigate("/dashboard");
      } finally {
        dispatch(reset());
      }
    };
    run();
  }, [isSuccess, dispatch, navigate]);

  const Auth = (e) => {
    e.preventDefault();
    dispatch(LoginUser({ email, password }));
  };

  return (
    <section className="hero is-fullheight is-fullwidth login-section">
      <div className="hero-body">
        <div className="container">
          <div className="columns is-centered">
            <div className="column is-4 is-mobile">
              <form onSubmit={Auth} className="box login-form">
                {isError && (
                  <p className="has-text-centered has-text-danger">{message}</p>
                )}
                <h1 className="title is-3 has-text-centered mb-5">Sign In</h1>

                {/* Email Input */}
                <div className="field">
                  <label className="label">Email</label>
                  <div className="control has-icons-left">
                    <input
                      type="email"
                      className="input is-medium"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      autoComplete="email"
                      required
                    />
                    <span className="icon is-small is-left">
                      <i className="fas fa-envelope"></i>
                    </span>
                  </div>
                </div>

                {/* Password Input */}
                <div className="field">
                  <label className="label">Password</label>
                  <div className="control has-icons-left">
                    <input
                      type="password"
                      className="input is-medium"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="******"
                      autoComplete="current-password"
                      required
                    />
                    <span className="icon is-small is-left">
                      <i className="fas fa-lock"></i>
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="field mt-5">
                  <button
                    type="submit"
                    className="button is-success is-fullwidth is-medium"
                    disabled={isLoading || !email || !password}
                  >
                    {isLoading ? (
                      <span className="spinner"></span>
                    ) : (
                      "Login"
                    )}
                  </button>
                </div>

                {/* Forgot Password Link */}
                <div className="field mt-3">
                  <p className="has-text-centered">
                    <a href="/forgot-password" className="has-text-link">
                      Forgot your password?
                    </a>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
