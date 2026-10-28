import React, { useEffect, useState } from "react";
import { MOCK_PROPERTIES, MOCK_OWNERS } from "../mockData.js";

const API = "";

export default function Admin({ usuario }) {
  const [tab, setTab] = useState("propietarios");
  const [propietarios, setPropietarios] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [confirmacion, setConfirmacion] = useState(null);
  const [editando, setEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({
    titulo: "",
    descripcion: "",
    direccion: "",
    maxHuespedes: "4",
    precioPorNoche: "",
    estado: "pending_review",
  });

  const cargarPanel = () => {
    setCargando(true);
    setPropietarios(MOCK_OWNERS);
    setPropiedades(MOCK_PROPERTIES);
    setCargando(false);
  };

  useEffect(() => {
    cargarPanel();
  }, []);

  const abrirEdicion = (prop) => {
    setEditando(prop);
    setFormEdit({
      titulo: prop.titulo || "",
      descripcion: prop.descripcion || "",
      direccion: prop.direccion || "",
      maxHuespedes: String(prop.maxHuespedes || 4),
      precioPorNoche: String(prop.precioPorNoche || 0),
      estado: prop.estado || "pending_review",
    });
  };

  const guardarEdicion = (e) => {
    e.preventDefault();
    if (!editando) return;
    setPropiedades((prev) =>
      prev.map((p) =>
        String(p._id || p.id) === String(editando._id || editando.id)
          ? {
              ...p,
              titulo: formEdit.titulo,
              descripcion: formEdit.descripcion,
              direccion: formEdit.direccion,
              maxHuespedes: Number(formEdit.maxHuespedes),
              precioPorNoche: Number(formEdit.precioPorNoche),
              estado: formEdit.estado,
            }
          : p
      )
    );
    setMensaje("Propiedad actualizada correctamente");
    setEditando(null);
  };

  const pedirConfirmacion = (tipo, prop) => {
    setConfirmacion({ tipo, prop });
  };

  const confirmarAccion = () => {
    if (!confirmacion) return;
    const { tipo, prop } = confirmacion;
    if (tipo === "eliminar") {
      setPropiedades((prev) =>
        prev.filter((p) => String(p._id || p.id) !== String(prop._id || prop.id))
      );
      setMensaje("Propiedad eliminada");
    } else if (tipo === "aprobar") {
      setPropiedades((prev) =>
        prev.map((p) =>
          String(p._id || p.id) === String(prop._id || prop.id)
            ? { ...p, estado: "disponible" }
            : p
        )
      );
      setMensaje("Propiedad aprobada");
    }
    setConfirmacion(null);
  };

  const aprobar = (prop) => pedirConfirmacion("aprobar", prop);
  const eliminar = (prop) => pedirConfirmacion("eliminar", prop);

  if (!usuario || usuario.rol !== "admin") {
    return (
      <section className="admin">
        <h2>Panel de administrador</h2>
        <p className="error">No tenes permisos para acceder a este panel.</p>
      </section>
    );
  }

  return (
    <div className="admin-panel">
      <header className="panel-header">
        <div>
          <p className="panel-kicker">GoyaQuintas Premium</p>
          <h1>Panel de Administración Central</h1>
          <p className="panel-subtitle">Hola, {usuario?.nombre || "Administrador"}. Control total de propietarios y propiedades.</p>
        </div>
      </header>

      {mensaje && <p className="ok">{mensaje}</p>}

      <div className="panel-tabs">
        <button className={`panel-tab ${tab === "propietarios" ? "active" : ""}`} onClick={() => setTab("propietarios")}>
          Gestión de Propietarios
        </button>
        <button className={`panel-tab ${tab === "propiedades" ? "active" : ""}`} onClick={() => setTab("propiedades")}>
          Control General de Propiedades
        </button>
      </div>

      {tab === "propietarios" && (
        <section className="panel-card">
          <div className="panel-card-header">
            <h2>Propietarios registrados</h2>
            <p className="nota">Cuentas con rol anfitrión y cantidad de propiedades.</p>
          </div>
          {cargando ? (
            <p className="nota">Cargando...</p>
          ) : propietarios.length === 0 ? (
            <p className="nota">No hay propietarios registrados.</p>
          ) : (
            <div className="tabla-wrapper">
              <table className="tabla-reservas">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                    <th>Propiedades</th>
                  </tr>
                </thead>
                <tbody>
                  {propietarios.map((u) => (
                    <tr key={u._id || u.id}>
                      <td>{u.nombre}</td>
                      <td>{u.apellido}</td>
                      <td>{u.correo}</td>
                      <td>{u.telefono || "-"}</td>
                      <td>{u.propiedades}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "propiedades" && (
        <section className="panel-card">
          <div className="panel-card-header">
            <h2>Todas las propiedades</h2>
            <p className="nota">Control global de casas quintas de la plataforma.</p>
          </div>
          {cargando ? (
            <p className="nota">Cargando...</p>
          ) : propiedades.length === 0 ? (
            <p className="nota">No hay propiedades registradas.</p>
          ) : (
            <div className="admin-prop-list">
              {propiedades.map((p) => (
                <article className="admin-prop-card" key={p._id || p.id}>
                  <div className="admin-prop-card-inner">
                    <img
                      className="admin-prop-thumb"
                      src={p.foto}
                      alt={p.titulo}
                      onError={(e) => e.currentTarget.classList.add("hidden")}
                    />
                    <div className="admin-prop-info">
                      <h3 className="admin-prop-title">{p.titulo}</h3>
                      <p className="admin-prop-line">
                        <strong>Propietario:</strong> {p.propietario?.nombre || "-"} {p.propietario?.apellido || ""}
                      </p>
                      <p className="admin-prop-line">{p.direccion || "Sin dirección"}</p>
                      <p className="admin-prop-line">
                        <strong>Precio:</strong> ${Number(p.precioPorNoche || 0).toLocaleString("es-AR")} por noche ·{" "}
                        <strong>Huéspedes:</strong> {p.maxHuespedes} · <strong>Estado:</strong>{" "}
                        {p.estado === "disponible" ? "Aprobada / Disponible" : "Bajo revisión"}
                      </p>
                    </div>
                    <div className="admin-prop-actions">
                      <button className="btn-admin btn-admin-edit" onClick={() => abrirEdicion(p)}>
                        Editar
                      </button>
                      <button className="btn-admin btn-admin-approve" onClick={() => aprobar(p)}>
                        Aprobar
                      </button>
                      <button className="btn-admin btn-admin-delete" onClick={() => eliminar(p)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {confirmacion && (
        <div className="modal-overlay">
          <div className="modal-card admin-confirm-modal">
            <h3>¿Estás seguro?</h3>
            <p>
              {confirmacion.tipo === "eliminar"
                ? "¿Estás seguro de que quieres eliminar esta propiedad?"
                : "¿Estás seguro de que quieres aprobar esta propiedad?"}
            </p>
            <div className="modal-actions">
              <button className="btn-secondary btn-admin-large" onClick={() => setConfirmacion(null)}>
                No, cancelar
              </button>
              <button
                className={
                  confirmacion.tipo === "eliminar"
                    ? "btn-danger btn-admin-large"
                    : "btn-primary btn-admin-large"
                }
                onClick={confirmarAccion}
              >
                {confirmacion.tipo === "eliminar" ? "Sí, eliminar" : "Sí, aprobar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Editar propiedad</h3>
            <form className="auth-form" onSubmit={guardarEdicion}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="edit-titulo">Título</label>
                <input
                  id="edit-titulo"
                  className="auth-input"
                  value={formEdit.titulo}
                  onChange={(e) => setFormEdit({ ...formEdit, titulo: e.target.value })}
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="edit-direccion">Dirección</label>
                <input
                  id="edit-direccion"
                  className="auth-input"
                  value={formEdit.direccion}
                  onChange={(e) => setFormEdit({ ...formEdit, direccion: e.target.value })}
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="edit-precio">Precio por noche</label>
                <input
                  id="edit-precio"
                  className="auth-input"
                  type="number"
                  min="0"
                  value={formEdit.precioPorNoche}
                  onChange={(e) => setFormEdit({ ...formEdit, precioPorNoche: e.target.value })}
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="edit-huespedes">Máx. huéspedes</label>
                <input
                  id="edit-huespedes"
                  className="auth-input"
                  type="number"
                  min="1"
                  value={formEdit.maxHuespedes}
                  onChange={(e) => setFormEdit({ ...formEdit, maxHuespedes: e.target.value })}
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="edit-estado">Estado</label>
                <select
                  id="edit-estado"
                  className="auth-input"
                  value={formEdit.estado}
                  onChange={(e) => setFormEdit({ ...formEdit, estado: e.target.value })}
                >
                  <option value="pending_review">Bajo revisión</option>
                  <option value="disponible">Aprobada / Disponible</option>
                </select>
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="edit-descripcion">Descripción</label>
                <input
                  id="edit-descripcion"
                  className="auth-input"
                  value={formEdit.descripcion}
                  onChange={(e) => setFormEdit({ ...formEdit, descripcion: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditando(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



