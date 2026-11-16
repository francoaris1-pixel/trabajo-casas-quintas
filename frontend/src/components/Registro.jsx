import React, { useState } from "react";
import { api } from "../api.js";

export default function Registro({ onRegistro, irALogin }) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    contrasena: "",
  });
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [touched, setTouched] = useState({
    nombre: false,
    correo: false,
    telefono: false,
    contrasena: false,
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const correoNormalizado = form.correo.trim();
  const telefonoNormalizado = form.telefono.trim().replace(/[^\d+]/g, "");
  const correoOk =
    !correoNormalizado || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado);
  const telefonoOk =
    !telefonoNormalizado || /^\+?\d{7,15}$/.test(telefonoNormalizado);
  const contrasenaOk = form.contrasena.length >= 8;
  const nombreInvalido = touched.nombre && !form.nombre.trim();
  const correoInvalido = touched.correo && !correoOk;
  const telefonoInvalido = touched.telefono && !telefonoOk;
  const contrasenaInvalida = touched.contrasena && !contrasenaOk;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setTouched({ nombre: true, correo: true, telefono: true, contrasena: true });
    if (
      !form.nombre.trim() ||
      !correoOk ||
      !telefonoOk ||
      (!correoNormalizado && !telefonoNormalizado) ||
      !contrasenaOk
    ) {
      setError("Revisa los campos marcados.");
      return;
    }
    setCargando(true);
    try {
      const datos = await api("/api/registro", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          correo: correoNormalizado || undefined,
          telefono: telefonoNormalizado || undefined,
        }),
      });
      await onRegistro(datos);
    } catch (requestError) {
      setError(requestError.message || "No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Crear cuenta</h2>
        <p className="auth-subtitle">Regístrate para reservar Goya Recibe.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-nombre">Nombre</label>
            <input
              id="reg-nombre"
              name="nombre"
              className={`auth-input ${nombreInvalido ? "input-error" : ""}`}
              placeholder="Nombre"
              value={form.nombre}
              onChange={handleChange}
              onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
              required
            />
            {nombreInvalido && <span className="auth-error">El nombre es obligatorio.</span>}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-apellido">Apellido</label>
            <input
              id="reg-apellido"
              name="apellido"
              className="auth-input"
              placeholder="Apellido"
              value={form.apellido}
              onChange={handleChange}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-correo">Correo electrónico (opcional)</label>
            <input
              id="reg-correo"
              type="email"
              name="correo"
              className={`auth-input ${correoInvalido ? "input-error" : ""}`}
              placeholder="tu@correo.com"
              value={form.correo}
              onChange={handleChange}
              onBlur={() => setTouched((t) => ({ ...t, correo: true }))}
            />
            {correoInvalido && <span className="auth-error">Ingresa un correo válido.</span>}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-telefono">
              Teléfono{correoNormalizado ? " (opcional)" : " (obligatorio si no agregas correo)"}
            </label>
            <input
              id="reg-telefono"
              type="tel"
              name="telefono"
              className={`auth-input ${telefonoInvalido ? "input-error" : ""}`}
              placeholder="Teléfono"
              value={form.telefono}
              onChange={handleChange}
              onBlur={() => setTouched((t) => ({ ...t, telefono: true }))}
              required={!correoNormalizado}
            />
            {telefonoInvalido && <span className="auth-error">Ingresa un teléfono válido.</span>}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-contrasena">Contraseña</label>
            <div className="auth-input-wrap">
              <input
                id="reg-contrasena"
                type={mostrarContrasena ? "text" : "password"}
                name="contrasena"
                className={`auth-input ${contrasenaInvalida ? "input-error" : ""}`}
                placeholder="Mínimo 8 caracteres"
                value={form.contrasena}
                onChange={handleChange}
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
            {cargando ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta?{" "}
          <button className="auth-link" onClick={irALogin}>
            Iniciar sesión
          </button>
        </p>
      </div>
    </div>
  );
}
