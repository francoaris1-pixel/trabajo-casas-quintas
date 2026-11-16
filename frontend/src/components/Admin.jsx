import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Admin({ usuario }) {
  const [tab, setTab] = useState("propietarios");
  const [propietarios, setPropietarios] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [confirmacion, setConfirmacion] = useState(null);
  const [editando, setEditando] = useState(null);
  const [fotosExistentes, setFotosExistentes] = useState([]);
  const [imagenesNuevas, setImagenesNuevas] = useState([]);
  const [errorImagenes, setErrorImagenes] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const previewUrls = React.useRef(new Set());
  const [formEdit, setFormEdit] = useState({
    titulo: "",
    descripcion: "",
    direccion: "",
    maxHuespedes: "4",
    precioPorNoche: "",
    estado: "pending_review",
  });

  const cargarPanel = async () => {
    setCargando(true);
    setError("");
    try {
      const [owners, panel] = await Promise.all([
        api("/api/admin/propietarios"),
        api("/api/admin/panel"),
      ]);
      setPropietarios(owners);
      setPropiedades(panel.propiedades);
    } catch (requestError) {
      setError(requestError.message || "No se pudo cargar el panel");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarPanel();
  }, []);

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    []
  );

  const abrirEdicion = (prop) => {
    setEditando(prop);
    setFotosExistentes(prop.fotos || (prop.foto ? [{ archivo: prop.foto }] : []));
    setImagenesNuevas([]);
    setErrorImagenes("");
    setFormEdit({
      titulo: prop.titulo || "",
      descripcion: prop.descripcion || "",
      direccion: prop.direccion || "",
      maxHuespedes: String(prop.maxHuespedes || 4),
      precioPorNoche: String(prop.precioPorNoche || 0),
      estado: prop.estado || "pending_review",
    });
  };

  const liberarPreviews = () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  };

  const cerrarEdicion = () => {
    liberarPreviews();
    setImagenesNuevas([]);
    setFotosExistentes([]);
    setErrorImagenes("");
    setEditando(null);
  };

  const seleccionarImagenes = (event) => {
    const seleccionadas = Array.from(event.target.files || []);
    event.target.value = "";
    if (!seleccionadas.length) return;

    const imagenesValidas = seleccionadas.filter((file) =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) &&
      file.size <= 5 * 1024 * 1024
    );
    if (imagenesValidas.length !== seleccionadas.length) {
      setErrorImagenes("Usá imágenes JPG, PNG, WebP o GIF de hasta 5 MB cada una.");
    } else {
      setErrorImagenes("");
    }

    const disponibles = Math.max(
      0,
      10 - fotosExistentes.length - imagenesNuevas.length
    );
    const paraAgregar = imagenesValidas.slice(0, disponibles);
    if (paraAgregar.length < imagenesValidas.length) {
      setErrorImagenes("La propiedad puede tener un máximo de 10 imágenes.");
    }
    const nuevasConPreview = paraAgregar.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { file, preview };
    });
    setImagenesNuevas((actuales) => [...actuales, ...nuevasConPreview]);
  };

  const quitarImagenNueva = (preview) => {
    URL.revokeObjectURL(preview);
    previewUrls.current.delete(preview);
    setImagenesNuevas((actuales) =>
      actuales.filter((imagen) => imagen.preview !== preview)
    );
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    if (!editando) return;
    setError("");
    setErrorImagenes("");
    setGuardandoEdicion(true);
    try {
      const datos = new FormData();
      Object.entries({
        ...formEdit,
        maxHuespedes: Number(formEdit.maxHuespedes),
        precioPorNoche: Number(formEdit.precioPorNoche),
      }).forEach(([key, value]) => datos.append(key, String(value)));
      datos.append(
        "keepPhotoIds",
        JSON.stringify(
          fotosExistentes.map((foto) => foto._id).filter(Boolean)
        )
      );
      imagenesNuevas.forEach(({ file }) => datos.append("images", file));

      const result = await api(`/api/admin/propiedades/${editando._id}`, {
        method: "PUT",
        body: datos,
      });
      setMensaje(result.mensaje);
      cerrarEdicion();
      await cargarPanel();
    } catch (requestError) {
      setError(requestError.message || "No se pudo actualizar la propiedad");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const pedirConfirmacion = (tipo, prop) => {
    setConfirmacion({ tipo, prop });
  };

  const confirmarAccion = async () => {
    if (!confirmacion) return;
    const { tipo, prop } = confirmacion;
    setError("");
    try {
      const result = tipo === "eliminar"
        ? await api(`/api/admin/propiedades/${prop._id}`, { method: "DELETE" })
        : await api(`/api/admin/propiedades/${prop._id}`, {
            method: "PUT",
            body: JSON.stringify({ estado: "disponible" }),
          });
      setMensaje(result.mensaje);
      setConfirmacion(null);
      await cargarPanel();
    } catch (requestError) {
      setError(requestError.message || "No se pudo completar la accion");
    }
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
          <h1>Panel de Administración Central</h1>
          <p className="panel-subtitle">Hola, {usuario?.nombre || "Administrador"}. Control total de propietarios y propiedades.</p>
        </div>
      </header>

      {mensaje && <p className="ok">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

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
                        {p.estado === "disponible"
                          ? "Aprobada / Disponible"
                          : p.estado === "suspendida"
                            ? "Suspendida"
                            : "Bajo revisión"}
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
          <div className="modal-card admin-edit-modal">
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
                <textarea
                  id="edit-descripcion"
                  className="auth-input"
                  value={formEdit.descripcion}
                  onChange={(e) => setFormEdit({ ...formEdit, descripcion: e.target.value })}
                />
              </div>
              <section className="image-manager" aria-labelledby="edit-images-title">
                <h4 id="edit-images-title">Imágenes de la propiedad</h4>
                <p className="image-manager-help">
                  Elegí JPG, PNG, WebP o GIF de hasta 5 MB. Máximo 10 imágenes.
                </p>
                <label className="image-upload-label" htmlFor="edit-images">
                  Seleccionar imágenes
                </label>
                <input
                  id="edit-images"
                  className="image-upload-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={seleccionarImagenes}
                />
                {errorImagenes && <p className="error">{errorImagenes}</p>}
                <div className="image-preview-grid">
                  {fotosExistentes.map((foto, index) => (
                    <figure className="image-preview" key={foto._id || foto.archivo}>
                      <img src={foto.archivo} alt={`Imagen actual ${index + 1}`} />
                      <button
                        type="button"
                        className="image-remove-btn"
                        onClick={() =>
                          setFotosExistentes((actuales) =>
                            actuales.filter((actual) => actual !== foto)
                          )
                        }
                        aria-label={`Quitar imagen actual ${index + 1}`}
                      >
                        Quitar
                      </button>
                    </figure>
                  ))}
                  {imagenesNuevas.map(({ file, preview }, index) => (
                    <figure className="image-preview" key={preview}>
                      <img src={preview} alt={`Nueva imagen ${index + 1}: ${file.name}`} />
                      <button
                        type="button"
                        className="image-remove-btn"
                        onClick={() => quitarImagenNueva(preview)}
                        aria-label={`Quitar imagen nueva ${index + 1}`}
                      >
                        Quitar
                      </button>
                    </figure>
                  ))}
                </div>
              </section>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={cerrarEdicion} disabled={guardandoEdicion}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={guardandoEdicion}>
                  {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
