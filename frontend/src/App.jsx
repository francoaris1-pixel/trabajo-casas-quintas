import React, { useState } from "react";
import Home from "./components/Home.jsx";
import Login from "./components/Login.jsx";
import Registro from "./components/Registro.jsx";
import VistaCliente from "./components/VistaCliente.jsx";
import PanelPropietario from "./components/PanelPropietario.jsx";
import Admin from "./components/Admin.jsx";
import { MOCK_PROPERTIES } from "./mockData.js";

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

  const handleLogin = async (datos) => {
    const usuarioLogueado = datos.usuario || datos;
    setUsuario(usuarioLogueado);
    setVista("panel");
    try {
      localStorage.setItem("user", JSON.stringify(usuarioLogueado));
    } catch {
      // ignore
    }

    const props = MOCK_PROPERTIES;
    setPropiedades(
      usuarioLogueado?.rol === "inquilino"
        ? props
        : props.filter((p) => p.propietario?._id === usuarioLogueado?.id)
    );
  };

  const handleLogout = () => {
    setUsuario(null);
    setPropiedades([]);
    setVista("home");
    try {
      localStorage.removeItem("user");
    } catch {
      // ignore
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
          <VistaCliente usuario={usuario} propiedades={propiedades} />
        </ErrorBoundary>
      );
    if (usuario.rol === "admin")
      return <Admin usuario={usuario} irAReservas={() => setVista("panel")} />;
    if (usuario.rol === "anfitrion")
      return <PanelPropietario usuario={usuario} />;
    return (
      <div style={{ padding: "40px", background: "#f3f0f7", height: "100vh" }}>
        Cargando panel de GoyaQuintas...
      </div>
    );
  };

  return (
    <div className="app">
      <nav className="navbar">
        <span className="logo" onClick={() => setVista("home")}>
          Casas & Quintas
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

      {vista === "home" && <Home irALogin={() => setVista("login")} />}
      {vista === "login" && <Login onLogin={handleLogin} />}
      {vista === "registro" && (
        <Registro onRegistro={handleLogin} irALogin={() => setVista("login")} />
      )}
      {vista === "panel" && panelPorRol()}
    </div>
  );
}


