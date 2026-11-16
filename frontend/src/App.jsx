import React, { useEffect, useState } from "react";
import Home from "./components/Home.jsx";
import Login from "./components/Login.jsx";
import Registro from "./components/Registro.jsx";
import VistaCliente from "./components/VistaCliente.jsx";
import PanelPropietario from "./components/PanelPropietario.jsx";
import Admin from "./components/Admin.jsx";
import {
  api,
  clearAuthToken,
  clearLegacyAuthData,
  getAuthToken,
  setAuthToken,
} from "./api.js";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("=== DIAGNÃ“STICO CLINE (ErrorBoundary) ===", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-state">
          <h2>Error en el panel</h2>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
export default function App() {
  // vista: "home" | "login" | "registro" | "panel"
  // El contenido del "panel" depende del rol del usuario
  const [vista, setVista] = useState("home");
  const [usuario, setUsuario] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [temaOscuro, setTemaOscuro] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = temaOscuro ? "dark" : "light";
    try {
      localStorage.setItem("theme", temaOscuro ? "dark" : "light");
    } catch {
      // El tema sigue funcionando aunque el navegador no permita persistirlo.
    }
  }, [temaOscuro]);

  useEffect(() => {
    clearLegacyAuthData();
    if (!getAuthToken()) {
      setAuthChecking(false);
      return;
    }
    api("/api/auth/me")
      .then(({ usuario: restoredUser }) => {
        setUsuario(restoredUser);
        setVista("panel");
      })
      .catch(() => clearAuthToken())
      .finally(() => setAuthChecking(false));
  }, []);

  const handleLogin = async (datos) => {
    const usuarioLogueado = datos.usuario || datos;
    setAuthToken(datos.token);
    setUsuario(usuarioLogueado);
    setVista("panel");
  };

  const handleLogout = () => {
    clearAuthToken();
    setUsuario(null);
    setVista("home");
  };

  const panelPorRol = () => {
    if (!usuario || !usuario.rol) {
      return (
        <div className="loading-state">
          Cargando panel de GoyaQuintas...
        </div>
      );
    }
    if (usuario.rol === "inquilino")
      return (
        <ErrorBoundary>
          <VistaCliente usuario={usuario} />
        </ErrorBoundary>
      );
    if (usuario.rol === "admin")
      return <Admin usuario={usuario} irAReservas={() => setVista("panel")} />;
    if (usuario.rol === "anfitrion")
      return <PanelPropietario usuario={usuario} />;
    return (
      <div className="loading-state">
        Cargando panel de GoyaQuintas...
      </div>
    );
  };

  return (
    <div className="app">
      <nav className="navbar">
        <span className="logo" onClick={() => setVista("home")}>
          <img src="/images/goya-recibe-logo.png" alt="" aria-hidden="true" />
          Goya Recibe
        </span>
        <div className="navbar-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTemaOscuro((actual) => !actual)}
            aria-label={`Cambiar a modo ${temaOscuro ? "claro" : "oscuro"}`}
            title={`Cambiar a modo ${temaOscuro ? "claro" : "oscuro"}`}
          >
            {temaOscuro ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
              </svg>
            )}
          </button>
          <button onClick={() => setVista("home")}>Home</button>
          {usuario ? (
            <>
              {usuario.rol === "inquilino" && (
                <button onClick={() => setVista("panel")}>Mis Reservas</button>
              )}
              {usuario.rol === "anfitrion" && (
                <button onClick={() => setVista("panel")}>Mi Panel</button>
              )}
              {usuario.rol === "admin" && (
                <button onClick={() => setVista("panel")}>Mi Panel</button>
              )}
              <span className="user">Hola, {usuario?.nombre}</span>
              <button onClick={handleLogout}>Salir</button>
            </>
          ) : (
            <>
              <button onClick={() => setVista("login")}>Login</button>
              <button onClick={() => setVista("registro")}>Registrarse</button>
            </>
          )}
        </div>
      </nav>

      {authChecking ? (
        <p className="nota">Verificando sesión...</p>
      ) : (
        <>
          {vista === "home" && (
            <Home
              irALogin={() => setVista("login")}
              usuario={usuario}
            />
          )}
          {vista === "login" && <Login onLogin={handleLogin} />}
          {vista === "registro" && (
            <Registro onRegistro={handleLogin} irALogin={() => setVista("login")} />
          )}
          {vista === "panel" && panelPorRol()}
        </>
      )}
      <footer className="site-footer">
        <p>&copy; 2026 Goya Recibe. Todos los derechos reservados.</p>
        <p>Goya, Corrientes - Argentina</p>
      </footer>
    </div>
  );
}
