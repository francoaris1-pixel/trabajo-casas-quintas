import React, { useEffect, useState } from "react";
import Home from "./components/Home.jsx";
import Login from "./components/Login.jsx";
import Registro from "./components/Registro.jsx";
import VistaCliente from "./components/VistaCliente.jsx";
import PanelPropietario from "./components/PanelPropietario.jsx";
import Admin from "./components/Admin.jsx";
import { MOCK_PROPERTIES } from "./mockData.js";

const esIdMongo = (id) => /^[a-f\d]{24}$/i.test(String(id || ""));

function filtrarNotificaciones(datos, usuario) {
  const usuarioId = String(usuario?._id || usuario?.id || "").toLowerCase();
  const usuarioEmail = String(usuario?.email || usuario?.correo || "")
    .trim()
    .toLowerCase();

  return datos.filter((notificacion) => {
    if (!notificacion) return false;
    const destinatario = notificacion.usuarioId
      || notificacion.destinatarioId
      || notificacion.usuario;
    const destinatarioId = String(
      destinatario && typeof destinatario === "object"
        ? destinatario._id || destinatario.id || ""
        : destinatario || ""
    ).toLowerCase();
    const destinatarioEmail = String(
      notificacion.destinatarioEmail || notificacion.usuarioEmail || ""
    ).trim().toLowerCase();

    return (
      (Boolean(usuarioId) && destinatarioId === usuarioId)
      || (Boolean(usuarioEmail) && destinatarioEmail === usuarioEmail)
    );
  });
}

async function obtenerNotificaciones(usuario) {
  const usuarioId = usuario?._id || usuario?.id;
  const res = await fetch(`/api/notificaciones/${usuarioId}`);
  const datos = await res.json();
  if (!res.ok) {
    throw new Error(datos.error || "No se pudieron cargar las notificaciones");
  }
  if (!Array.isArray(datos)) {
    throw new Error("La respuesta de notificaciones no es valida");
  }
  return filtrarNotificaciones(datos, usuario);
}

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
        <div style={{ padding: "40px", background: "#f3f0f7", height: "100vh" }}>
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
  const [vista, setVista] = useState(() => {
    try {
      return localStorage.getItem("user") ? "panel" : "home";
    } catch {
      return "home";
    }
  });
  const [usuario, setUsuario] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [propiedades, setPropiedades] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [errorNotificaciones, setErrorNotificaciones] = useState("");
  const [errorPropiedades, setErrorPropiedades] = useState("");

  const handleLogin = (datos) => {
    const usuarioLogueado = datos.usuario || datos;
    setUsuario(usuarioLogueado);
    setVista("panel");
    setErrorPropiedades("");
    try {
      localStorage.setItem("user", JSON.stringify(usuarioLogueado));
    } catch {
      // ignore
    }

    if (esIdMongo(usuarioLogueado?.id)) {
      setPropiedades([]);
      setErrorPropiedades("");
    } else {
      const props = MOCK_PROPERTIES;
      setPropiedades(
        usuarioLogueado?.rol === "inquilino"
          ? props
          : props.filter((p) => p.propietario?._id === usuarioLogueado?.id)
      );
    }
  };

  useEffect(() => {
    if (!esIdMongo(usuario?.id) || usuario.rol !== "inquilino") return undefined;
    let activo = true;
    const cargarPropiedades = async () => {
      try {
        const res = await fetch("/api/propiedades");
        const datos = await res.json();
        if (!res.ok) throw new Error(datos.error || "No se pudieron cargar las propiedades");
        if (activo) {
          setPropiedades(datos);
          setErrorPropiedades("");
        }
      } catch (error) {
        if (activo) {
          setPropiedades([]);
          setErrorPropiedades(error.message || "No se pudo conectar con el servidor");
        }
      }
    };
    cargarPropiedades();
    return () => {
      activo = false;
    };
  }, [usuario?.id, usuario?.rol]);

  const handleLogout = () => {
    setUsuario(null);
    setPropiedades([]);
    setNotificaciones([]);
    setVista("home");
    try {
      localStorage.removeItem("user");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (vista !== "panel") return;
    if (!usuario) {
      setVista("login");
      return;
    }
    if (!["inquilino", "anfitrion", "admin"].includes(usuario.rol)) {
      setUsuario(null);
      setPropiedades([]);
      setNotificaciones([]);
      setVista("home");
      try {
        localStorage.removeItem("user");
      } catch {
        // ignore
      }
    }
  }, [vista, usuario]);

  const actualizarNotificaciones = async () => {
    const usuarioId = usuario?._id || usuario?.id;
    if (esIdMongo(usuarioId)) {
      try {
        const datos = await obtenerNotificaciones(usuario);
        setNotificaciones(datos);
        setErrorNotificaciones("");
      } catch (error) {
        setErrorNotificaciones(error.message || "No se pudo conectar con el servidor");
      }
      return;
    }
    setNotificaciones([]);
  };

  useEffect(() => {
    const usuarioId = usuario?._id || usuario?.id;
    setNotificaciones([]);
    setErrorNotificaciones("");
    if (!esIdMongo(usuarioId)) {
      return undefined;
    }

    let activo = true;
    const cargarNotificaciones = async () => {
      try {
        const datos = await obtenerNotificaciones(usuario);
        if (activo) {
          setNotificaciones(datos);
          setErrorNotificaciones("");
        }
      } catch (error) {
        if (activo) setErrorNotificaciones(error.message || "No se pudo conectar con el servidor");
      }
    };

    cargarNotificaciones();
    const intervalo = window.setInterval(cargarNotificaciones, 30000);
    return () => {
      activo = false;
      window.clearInterval(intervalo);
    };
  }, [usuario?._id, usuario?.id]);

  const alternarNotificaciones = async () => {
    const abrir = !notificacionesAbiertas;
    setNotificacionesAbiertas(abrir);
    const usuarioId = usuario?._id || usuario?.id;
    if (!abrir || !esIdMongo(usuarioId)) return;

    try {
      const res = await fetch(`/api/notificaciones/leer/${usuarioId}`, {
        method: "PUT",
      });
      const datos = await res.json();
      if (!res.ok) {
        throw new Error(datos.error || "No se pudieron marcar las notificaciones como leidas");
      }
      setNotificaciones((actuales) =>
        actuales.map((item) => ({ ...item, leida: true }))
      );
      setErrorNotificaciones("");
    } catch (error) {
      setErrorNotificaciones(error.message || "No se pudo conectar con el servidor");
    }
  };

  const panelPorRol = () => {
    if (!usuario || !usuario.rol) {
      return (
        <div style={{ padding: "40px", background: "#f3f0f7", height: "100vh" }}>
          Cargando panel de GoyaQuintas...
        </div>
      );
    }
    if (usuario.rol === "inquilino")
      return (
        <ErrorBoundary>
          <VistaCliente usuario={usuario} propiedades={propiedades} onNotification={actualizarNotificaciones} />
        </ErrorBoundary>
      );
    if (usuario.rol === "admin")
      return <Admin usuario={usuario} irAReservas={() => setVista("panel")} />;
    if (usuario.rol === "anfitrion")
      return <PanelPropietario usuario={usuario} onNotification={actualizarNotificaciones} />;
    return null;
  };

  return (
    <div className="app">
      <nav className="navbar">
        <span className="logo" onClick={() => setVista("home")}>
          Goya Recibe
        </span>
        <div>
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
                          <li key={item._id}>
                            <span>{item.mensaje}</span>
                            <time>
                              {(item.fecha || item.fechaCreacion)
                                ? new Date(item.fecha || item.fechaCreacion).toLocaleString("es-AR")
                                : ""}
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

      {vista === "home" && <Home irALogin={() => setVista("login")} usuario={usuario} />}
      {vista === "login" && <Login onLogin={handleLogin} />}
      {vista === "registro" && (
        <Registro onRegistro={handleLogin} irALogin={() => setVista("login")} />
      )}
      {errorPropiedades && <p className="error app-error">{errorPropiedades}</p>}
      {vista === "panel" && panelPorRol()}
    </div>
  );
}


