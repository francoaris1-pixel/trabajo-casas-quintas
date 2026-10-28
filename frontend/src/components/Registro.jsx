import React, { useState } from "react";

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
    contrasena: false,
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo);
  const contrasenaOk = form.contrasena.length >= 6;
  const nombreInvalido = touched.nombre && !form.nombre.trim();
  const correoInvalido = touched.correo && !correoOk;
  const contrasenaInvalida = touched.contrasena && !contrasenaOk;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setTouched({ nombre: true, correo: true, contrasena: true });
    if (!form.nombre.trim() || !correoOk || !contrasenaOk) {
      setError("Revisa los campos marcados.");
      return;
    }
    setCargando(true);
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const datos = await res.json();
      if (!res.ok) {
        setError(datos.error || "Error al registrarse");
      } else {
        onRegistro(datos);
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Crear cuenta</h2>
        <p className="auth-subtitle">Registrate para reservar casas y quintas.</p>
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
            <label className="auth-label" htmlFor="reg-correo">Correo electronico</label>
            <input
              id="reg-correo"
              type="email"
              name="correo"
              className={`auth-input ${correoInvalido ? "input-error" : ""}`}
              placeholder="tu@correo.com"
              value={form.correo}
              onChange={handleChange}
              onBlur={() => setTouched((t) => ({ ...t, correo: true }))}
              required
            />
            {correoInvalido && <span className="auth-error">Ingresa un correo valido.</span>}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-telefono">Telefono</label>
            <input
              id="reg-telefono"
              name="telefono"
              className="auth-input"
              placeholder="Telefono (opcional)"
              value={form.telefono}
              onChange={handleChange}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-contrasena">Contrasena</label>
            <div className="auth-input-wrap">
              <input
                id="reg-contrasena"
                type={mostrarContrasena ? "text" : "password"}
                name="contrasena"
                className={`auth-input ${contrasenaInvalida ? "input-error" : ""}`}
                placeholder="Minimo 6 caracteres"
                value={form.contrasena}
                onChange={handleChange}
                onBlur={() => setTouched((t) => ({ ...t, contrasena: true }))}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setMostrarContrasena((v) => !v)}
                aria-label="Mostrar u ocultar contrasena"
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
            {contrasenaInvalida && <span className="auth-error">Minimo 6 caracteres.</span>}
          </div>

          {error && <p className="error">{error}</p>}
          <button className="auth-btn" disabled={cargando}>
            {cargando ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tenes cuenta?{" "}
          <button className="auth-link" onClick={irALogin}>
            Iniciar sesion
          </button>
        </p>
      </div>
    </div>
  );
}

