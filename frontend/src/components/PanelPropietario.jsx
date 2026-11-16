import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const fmtMoney = (n) => "$" + Number(n || 0).toLocaleString("es-AR");
const fmtDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
};

export default function PanelPropietario({ usuario, onNotification }) {
  const [propiedades, setPropiedades] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [estadisticas, setEstadisticas] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [reservaActualizandoId, setReservaActualizandoId] = useState(null);
  const [nueva, setNueva] = useState({
    titulo: "",
    descripcion: "",
    direccion: "",
    maxHuespedes: "4",
    precioPorNoche: "",
  });

  const cargarPanel = async () => {
    setError("");
    try {
      const panel = await api("/api/propietario/panel");
      setPropiedades(panel.propiedades);
      setReservas(panel.reservas);
      setEstadisticas(panel.estadisticas);
    } catch (requestError) {
      setError(requestError.message || "No se pudo cargar el panel");
    }
  };

  useEffect(() => {
    void cargarPanel();
  }, []);

  const publicar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const result = await api("/api/propiedades", {
        method: "POST",
        body: JSON.stringify(nueva),
      });
      setMensaje(result.mensaje);
      setNueva({
        titulo: "",
        descripcion: "",
        direccion: "",
        maxHuespedes: "4",
        precioPorNoche: "",
      });
      await cargarPanel();
    } catch (requestError) {
      setError(requestError.message || "No se pudo publicar la propiedad");
    } finally {
      setGuardando(false);
    }
  };

  const guardarEdicion = async (prop) => {
    setError("");
    try {
      const result = await api(`/api/propietario/propiedades/${prop._id}`, {
        method: "PUT",
        body: JSON.stringify({
          titulo: prop.titulo,
          descripcion: prop.descripcion,
          direccion: prop.direccion,
          maxHuespedes: prop.maxHuespedes,
          precioPorNoche: prop.precioPorNoche,
        }),
      });
      setMensaje(result.mensaje);
      await cargarPanel();
    } catch (requestError) {
      setError(requestError.message || "No se pudo actualizar la propiedad");
    }
  };

  const eliminar = async (prop) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta propiedad?")) return;
    setError("");
    try {
      const result = await api(`/api/propietario/propiedades/${prop._id}`, {
        method: "DELETE",
      });
      setMensaje(result.mensaje);
      await cargarPanel();
    } catch (requestError) {
      setError(requestError.message || "No se pudo eliminar la propiedad");
    }
  };

  const gestionarReserva = async (reservaId, accion) => {
    setReservaActualizandoId(reservaId);
    setError("");
    try {
      const result = await api(`/api/reservas/${reservaId}/accion`, {
        method: "PUT",
        body: JSON.stringify({ accion }),
      });
      setMensaje(result.mensaje);
      await cargarPanel();
      await onNotification?.();
    } catch (requestError) {
      setError(requestError.message || "No se pudo actualizar la reserva");
    } finally {
      setReservaActualizandoId(null);
    }
  };

  const editarCampo = (id, campo, valor) =>
    setPropiedades((prev) =>
      prev.map((p) => (String(p._id) === String(id) ? { ...p, [campo]: valor } : p))
    );

  return (
    <div className="panel-propietario">
      <header className="panel-header">
        <div>
          <h1>Panel de Gestión</h1>
          <p className="panel-subtitle">Hola, {usuario?.nombre || "anfitrion"}. Administra tus quintas, reservas e ingresos.</p>
        </div>
      </header>

      {mensaje && <p className="ok">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      <section className="panel-card">
        <div className="panel-card-header">
          <h2>Publicar propiedad nueva</h2>
          <p className="nota">Completa los datos para agregar una quinta a tu panel.</p>
        </div>
        <form className="form-grid" onSubmit={publicar}>
          <div className="form-field">
            <label className="form-label" htmlFor="pub-titulo">Título</label>
            <input id="pub-titulo" className="form-input" placeholder="Ej: Quinta Los Lapachos" value={nueva.titulo} onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })} required />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pub-direccion">Dirección / Zona</label>
            <input id="pub-direccion" className="form-input" placeholder="Zona Norte, Goya, Corrientes" value={nueva.direccion} onChange={(e) => setNueva({ ...nueva, direccion: e.target.value })} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pub-huespedes">Máx. huéspedes</label>
            <input id="pub-huespedes" className="form-input" type="number" min="1" value={nueva.maxHuespedes} onChange={(e) => setNueva({ ...nueva, maxHuespedes: e.target.value })} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pub-precio">Precio por noche</label>
            <input id="pub-precio" className="form-input" type="number" min="0" placeholder="85000" value={nueva.precioPorNoche} onChange={(e) => setNueva({ ...nueva, precioPorNoche: e.target.value })} required />
          </div>
          <div className="form-field form-field-wide">
            <label className="form-label" htmlFor="pub-descripcion">Descripción</label>
            <input id="pub-descripcion" className="form-input" placeholder="Quinta con pileta, wifi y cochera" value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} required />
          </div>
          <div className="form-actions">
            <button className="btn-primary btn-large" type="submit" disabled={guardando}>
              {guardando ? "Publicando..." : "Publicar Quinta"}
            </button>
          </div>
        </form>
      </section>

      <section className="stats-grid">
        <article className="stat-card stat-blue">
          <span className="stat-label">Noches alquiladas</span>
          <strong className="stat-value">{estadisticas.reduce((t, e) => t + (e.noches || 0), 0)}</strong>
        </article>
        <article className="stat-card stat-green">
          <span className="stat-label">Ingresos brutos</span>
          <strong className="stat-value">{fmtMoney(estadisticas.reduce((t, e) => t + (e.ingresos || 0), 0))}</strong>
        </article>
        <article className="stat-card stat-violet">
          <span className="stat-label">Monto a liquidar (90%)</span>
          <strong className="stat-value">{fmtMoney(estadisticas.reduce((t, e) => t + (e.liquidacion || 0), 0))}</strong>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-card-header">
          <h2>Mis propiedades</h2>
          <p className="nota">Edita tus propiedades publicadas y revisa su estado.</p>
        </div>
        {propiedades.length === 0 ? (
          <p className="nota">Aún no tienes propiedades publicadas.</p>
        ) : (
          <div className="propiedades-list">
            {propiedades.map((p) => (
              <article className="propiedad-row" key={p._id}>
                <div className="propiedad-row-main">
                  <div>
                    <h3>{p.titulo}</h3>
                    <p className="nota">{p.direccion || "Sin dirección"}</p>
                  </div>
                  <span className={`estado-badge ${p.estado === "disponible" ? "aprobada" : "pendiente"}`}>
                    {p.estado === "pending_review"
                      ? "Bajo revisión ⏳"
                      : p.estado === "suspendida"
                        ? "Suspendida"
                        : "Aprobada 🟢"}
                  </span>
                </div>
                <div className="propiedad-row-fields">
                  <input className="form-input" value={p.titulo} onChange={(e) => editarCampo(p._id, "titulo", e.target.value)} placeholder="Título" />
                  <input className="form-input" type="number" min="0" value={p.precioPorNoche} onChange={(e) => editarCampo(p._id, "precioPorNoche", e.target.value)} placeholder="Precio" />
                  <input className="form-input" value={p.descripcion} onChange={(e) => editarCampo(p._id, "descripcion", e.target.value)} placeholder="Descripción" />
                  <input className="form-input" value={p.direccion} onChange={(e) => editarCampo(p._id, "direccion", e.target.value)} placeholder="Dirección" />
                  <input className="form-input" type="number" min="1" value={p.maxHuespedes} onChange={(e) => editarCampo(p._id, "maxHuespedes", e.target.value)} placeholder="Huéspedes" />
                  <div className="row-actions">
                    <button className="btn-primary chico" onClick={() => guardarEdicion(p)}>
                      Guardar
                    </button>
                    <button className="btn-danger chico" onClick={() => eliminar(p)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-card-header">
          <h2>Reservas recibidas</h2>
          <p className="nota">Gestiona las reservas de tus propiedades.</p>
        </div>
        {reservas.length === 0 ? (
          <p className="nota">Todavía no hay reservas.</p>
        ) : (
          <div className="tabla-wrapper">
            <table className="tabla-reservas">
              <thead>
                <tr>
                  <th>Propiedad</th>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r.id || r._id}>
                    <td>{r.propiedadTitulo || "-"}</td>
                    <td>{r.turista?.nombre || "-"} {r.turista?.apellido || ""}</td>
                    <td>{r.turista?.telefono || "-"}</td>
                    <td>{fmtDate(r.checkIn)}</td>
                    <td>{fmtDate(r.checkOut)}</td>
                    <td>{r.estado === "rechazada" ? "Rechazada" : r.estado || "Confirmada"}</td>
                    <td>
                      {r.estado === "pendiente" && (
                        <div className="reservation-actions">
                          <button
                            type="button"
                            className="btn-primary chico"
                            onClick={() => gestionarReserva(r.id, "confirmar")}
                            disabled={reservaActualizandoId === r.id}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            className="btn-danger chico"
                            onClick={() => gestionarReserva(r.id, "rechazar")}
                            disabled={reservaActualizandoId === r.id}
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
