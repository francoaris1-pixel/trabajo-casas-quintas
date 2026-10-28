import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [touched, setTouched] = useState({ correo: false, contrasena: false });

  const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  const contrasenaOk = contrasena.length >= 6;
  const correoInvalido = touched.correo && !correoOk;
  const contrasenaInvalida = touched.contrasena && !contrasenaOk;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setTouched({ correo: true, contrasena: true });
    if (!correoOk || !contrasenaOk) {
      setError("Revisa los campos marcados.");
      return;
    }
    setCargando(true);
    setError("");

    window.setTimeout(() => {
      let usuarioLogueado;
      const email = correo.toLowerCase();

      if (email === "admin@quintasgoya.com") {
        usuarioLogueado = {
          id: "1",
          _id: "1",
          nombre: "Administrador",
          apellido: "Maestro",
          correo,
          telefono: "",
          rol: "admin",
        };
      } else if (email.includes("propietario") || email.includes("anfitrion")) {
        usuarioLogueado = {
          id: "2",
          _id: "2",
          nombre: "Juan",
          apellido: "Perez",
          correo,
          telefono: "3794000000",
          rol: "anfitrion",
        };
      } else {
        usuarioLogueado = {
          id: "3",
          _id: "3",
          nombre: correo.split("@")[0] || "Usuario",
          apellido: "Demo",
          correo,
          telefono: "",
          rol: "inquilino",
        };
      }

      try {
        localStorage.setItem("user", JSON.stringify(usuarioLogueado));
      } catch {
        // ignore
      }
      onLogin({ mensaje: "Bienvenido", usuario: usuarioLogueado });
      setCargando(false);
    }, 350);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Iniciar sesion</h2>
        <p className="auth-subtitle">Accede a tu cuenta para gestionar reservas.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-correo">Correo electronico</label>
            <input
              id="login-correo"
              className={`auth-input ${correoInvalido ? "input-error" : ""}`}
              type="email"
              placeholder="tu@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, correo: true }))}
              required
            />
            {correoInvalido && <span className="auth-error">Ingresa un correo valido.</span>}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-contrasena">Contrasena</label>
            <div className="auth-input-wrap">
              <input
                id="login-contrasena"
                className={`auth-input ${contrasenaInvalida ? "input-error" : ""}`}
                type={mostrarContrasena ? "text" : "password"}
                placeholder="Minimo 6 caracteres"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
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
            {cargando ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}



