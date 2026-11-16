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
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [errorNotificaciones, setErrorNotificaciones] = useState("");
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
    setNotificaciones([]);
    setNotificacionesAbiertas(false);
    setVista("home");
  };

  const actualizarNotificaciones = async () => {
    if (!usuario) return;
    try {
      const datos = await api("/api/notificaciones");
      setNotificaciones(datos);
      setErrorNotificaciones("");
    } catch (requestError) {
      setErrorNotificaciones(requestError.message || "No se pudieron cargar las notificaciones");
    }
  };

  useEffect(() => {
    if (!usuario) {
      setNotificaciones([]);
      return undefined;
    }
    let active = true;
    const cargar = async () => {
      try {
        const datos = await api("/api/notificaciones");
        if (active) {
          setNotificaciones(datos);
          setErrorNotificaciones("");
        }
      } catch (requestError) {
        if (active) {
          setErrorNotificaciones(
            requestError.message || "No se pudieron cargar las notificaciones"
          );
        }
      }
    };
    void cargar();
    const intervalId = window.setInterval(cargar, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [usuario?._id, usuario?.id]);

  const alternarNotificaciones = async () => {
    const abrir = !notificacionesAbiertas;
    setNotificacionesAbiertas(abrir);
    if (!abrir || !notificaciones.some((item) => !item.leida)) return;
    try {
      await api("/api/notificaciones/leer", { method: "PUT" });
      setNotificaciones((items) => items.map((item) => ({ ...item, leida: true })));
      setErrorNotificaciones("");
    } catch (requestError) {
      setErrorNotificaciones(
        requestError.message || "No se pudieron marcar las notificaciones como leídas"
      );
    }
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
          <VistaCliente usuario={usuario} onNotification={actualizarNotificaciones} />
        </ErrorBoundary>
      );
    if (usuario.rol === "admin")
      return <Admin usuario={usuario} irAReservas={() => setVista("panel")} />;
    if (usuario.rol === "anfitrion")
      return <PanelPropietario usuario={usuario} onNotification={actualizarNotificaciones} />;
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
              <div className="notification-menu">
                <button
                  type="button"
                  className="notification-toggle"
                  onClick={alternarNotificaciones}
                  aria-label="Notificaciones"
                  aria-expanded={notificacionesAbiertas}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M10 21h4" />
                  </svg>
                  {notificaciones.some((item) => !item.leida) && (
                    <span className="notification-count">
                      {notificaciones.filter((item) => !item.leida).length}
                    </span>
                  )}
                </button>
                {notificacionesAbiertas && (
                  <div className="notification-dropdown">
                    <h2>Notificaciones recientes</h2>
                    {errorNotificaciones && <p className="error">{errorNotificaciones}</p>}
                    {notificaciones.length === 0 ? (
                      <p className="nota">No hay notificaciones recientes.</p>
                    ) : (
                      <ul>
                        {notificaciones.map((item) => (
                          <li key={item._id} className={item.leida ? "" : "unread"}>
                            <span>{item.mensaje}</span>
                            <time dateTime={item.fecha}>
                              {new Date(item.fecha).toLocaleString("es-AR")}
                            </time>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
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
