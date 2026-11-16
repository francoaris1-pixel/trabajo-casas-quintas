import React, { useState } from "react";
import { api } from "../api.js";

export default function Login({ onLogin }) {
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [touched, setTouched] = useState({ identificador: false, contrasena: false });

  const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identificador.trim());
  const telefonoOk = /^\+?[\d\s()-]{7,20}$/.test(identificador.trim());
  const identificadorOk = correoOk || telefonoOk;
  const contrasenaOk = contrasena.length >= 8;
  const identificadorInvalido = touched.identificador && !identificadorOk;
  const contrasenaInvalida = touched.contrasena && !contrasenaOk;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setTouched({ identificador: true, contrasena: true });
    if (!identificadorOk || !contrasenaOk) {
      setError("Revisa los campos marcados.");
      return;
    }
    setCargando(true);
    try {
      const datos = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ identificador: identificador.trim(), contrasena }),
      });
      await onLogin(datos);
    } catch (requestError) {
      setError(requestError.message || "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Iniciar sesión</h2>
        <p className="auth-subtitle">Accede a tu cuenta para gestionar reservas.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-identificador">Correo electrónico o teléfono</label>
            <input
              id="login-identificador"
              className={`auth-input ${identificadorInvalido ? "input-error" : ""}`}
              type="text"
              autoComplete="username"
              placeholder="Correo electrónico o teléfono"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, identificador: true }))}
              required
            />
            {identificadorInvalido && <span className="auth-error">Ingresa un correo electrónico o teléfono válido.</span>}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-contrasena">Contraseña</label>
            <div className="auth-input-wrap">
              <input
                id="login-contrasena"
                className={`auth-input ${contrasenaInvalida ? "input-error" : ""}`}
                type={mostrarContrasena ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, contrasena: true }))}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setMostrarContrasena((v) => !v)}
                aria-label="Mostrar u ocultar contraseña"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {mostrarContrasena ? (
                    <>
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 9.88a3 3 0 1 1-4.24 4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {contrasenaInvalida && <span className="auth-error">Mínimo 8 caracteres.</span>}
          </div>

          {error && <p className="error">{error}</p>}
          <button className="auth-btn" disabled={cargando}>
            {cargando ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

