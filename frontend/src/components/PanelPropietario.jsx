import React, { useEffect, useState } from "react";
import { MOCK_PROPERTIES, MOCK_RESERVATIONS } from "../mockData.js";

const fmtMoney = (n) => "$" + Number(n || 0).toLocaleString("es-AR");
const fmtDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
};

const esIdMongo = (id) => /^[a-f\d]{24}$/i.test(String(id || ""));

export default function PanelPropietario({ usuario, onNotification }) {
  const ownerId = usuario?.id || usuario?._id || "2";
  const [propiedades, setPropiedades] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [estadisticas, setEstadisticas] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [accionandoId, setAccionandoId] = useState("");
  const [nueva, setNueva] = useState({
    titulo: "",
    descripcion: "",
    direccion: "",
    maxHuespedes: "4",
    precioPorNoche: "",
    estado: "pending_review",
  });

  const recalcular = (props, reservasList) => {
    const stats = props.map((p) => {
      const rs = reservasList.filter((r) => String(r.propiedadId) === String(p._id));
      const noches = rs.reduce((t, r) => {
        const ini = new Date(r.checkIn);
        const fin = new Date(r.checkOut);
        if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime())) return t;
        return t + Math.max(1, Math.round((fin - ini) / 86400000));
      }, 0);
      return {
        propiedadId: p._id,
        titulo: p.titulo,
        precioPorNoche: p.precioPorNoche,
        reservas: rs.length,
        noches,
        ingresos: noches * (p.precioPorNoche || 0),
        liquidacion: noches * (p.precioPorNoche || 0) * 0.9,
      };
    });
    setEstadisticas(stats);
  };

  const cargarPanel = async () => {
    if (esIdMongo(ownerId)) {
      try {
        const [propsRes, reservasRes] = await Promise.all([
          fetch(`/api/propiedades/propietario/${ownerId}`),
          fetch(`/api/reservas/propietario/${ownerId}`),
        ]);
        const propsDatos = await propsRes.json();
        const reservasDatos = await reservasRes.json();
        if (!propsRes.ok || !reservasRes.ok) {
          throw new Error(propsDatos.error || reservasDatos.error || "No se pudo cargar el panel");
        }
        setPropiedades(propsDatos);
        setReservas(reservasDatos);
        recalcular(propsDatos, reservasDatos);
      } catch (error) {
        setError(error.message || "No se pudo conectar con el servidor");
      }
      return;
    }

    const props = MOCK_PROPERTIES.filter(
      (p) => String(p.propietario?._id || p.propietario) === String(ownerId)
    );
    const reservasList = MOCK_RESERVATIONS.filter((r) =>
      props.some((p) => String(p._id) === String(r.propiedadId))
    );
    setPropiedades(props);
    setReservas(reservasList);
    recalcular(props, reservasList);
  };

  useEffect(() => {
    cargarPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const totalNoches = estadisticas.reduce((t, e) => t + (e.noches || 0), 0);
  const totalIngresos = estadisticas.reduce((t, e) => t + (e.ingresos || 0), 0);
  const totalLiquidacion = estadisticas.reduce((t, e) => t + (e.liquidacion || 0), 0);

  const publicar = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");
    setGuardando(true);
    let publicado = false;
    const nuevaProp = {
      _id: `mock-${Date.now()}`,
      titulo: nueva.titulo || "Nueva quinta",
      descripcion: nueva.descripcion || "Quinta en Goya",
      direccion: nueva.direccion || "Goya, Corrientes",
      maxHuespedes: Number(nueva.maxHuespedes) || 4,
      precioPorNoche: Number(nueva.precioPorNoche) || 0,
      estado: nueva.estado || "pending_review",
      propietario: { _id: ownerId, nombre: usuario?.nombre || "Anfitrion", apellido: "" },
    };
    try {
      if (esIdMongo(ownerId)) {
        const res = await fetch("/api/propiedades", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Usuario-ID": ownerId,
          },
          body: JSON.stringify({
            ...nueva,
            precioPorNoche: Number(nueva.precioPorNoche),
          }),
        });
        const datos = await res.json();
        if (!res.ok) throw new Error(datos.error || "No se pudo publicar la propiedad");
        setPropiedades((prev) => [datos.propiedad, ...prev]);
        onNotification?.(datos.evento);
        setMensaje(datos.mensaje);
        publicado = true;
      } else {
        setPropiedades((prev) => [nuevaProp, ...prev]);
        onNotification?.({
          _id: `local-${Date.now()}`,
          tipo: "propiedad_pendiente",
          mensaje: `Nueva propiedad pendiente de revisión: ${nuevaProp.titulo}.`,
          fechaCreacion: new Date().toISOString(),
        });
        setMensaje("Propiedad publicada correctamente");
        publicado = true;
      }
    } catch (error) {
      setError(error.message || "No se pudo conectar con el servidor");
    } finally {
      setGuardando(false);
    }
    if (publicado) {
      setNueva({
        titulo: "",
        descripcion: "",
        direccion: "",
        maxHuespedes: "4",
        precioPorNoche: "",
        estado: "pending_review",
      });
    }
  };

  const gestionarReserva = async (reserva, accion) => {
    const id = reserva.id || reserva._id;
    setAccionandoId(id);
    setMensaje("");
    setError("");
    try {
      if (esIdMongo(ownerId) && esIdMongo(id)) {
        const res = await fetch(`/api/reservas/${id}/accion`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion, anfitrionId: ownerId }),
        });
        const datos = await res.json();
        if (!res.ok) throw new Error(datos.error || "No se pudo gestionar la reserva");
        setReservas((prev) =>
          prev.map((r) =>
            String(r.id || r._id) === String(id)
              ? { ...r, estado: datos.reserva.estado }
              : r
          )
        );
        const estadoTexto = accion === "recordatorio"
          ? "Recordatorio enviado"
          : `Reserva ${datos.reserva.estado === "confirmada" ? "confirmada" : "rechazada"}`;
        const destino = datos.notificacion?.telefono
          ? ` al cliente ${datos.notificacion.telefono}`
          : " al cliente";
        if (datos.notificacion?.enviada) {
          setMensaje(`${estadoTexto}. Notificación enviada por email${destino}.`);
        } else if (datos.notificacion?.modoPrueba) {
          setMensaje(`${estadoTexto}. Email registrado en modo de prueba; no se envió al cliente${destino}.`);
        } else {
          setError(`${estadoTexto}, pero no se pudo enviar el email${destino}.`);
        }
        onNotification?.(datos.evento);
      } else {
        const estado = accion === "confirmar" ? "confirmada" : accion === "rechazar" ? "rechazada" : reserva.estado;
        const index = MOCK_RESERVATIONS.findIndex((r) => String(r.id || r._id) === String(id));
        if (index >= 0) MOCK_RESERVATIONS[index].estado = estado;
        setReservas((prev) =>
          prev.map((r) => (String(r.id || r._id) === String(id) ? { ...r, estado } : r))
        );
        const nombre = reserva.turista?.telefono
          ? ` al cliente ${reserva.turista.telefono}`
          : " al cliente";
        setMensaje(`${accion === "recordatorio" ? "Recordatorio registrado" : `Reserva ${estado}`}. Aviso generado en modo demo${nombre}.`);
        onNotification?.({
          _id: `local-${Date.now()}`,
          tipo: accion === "recordatorio" ? "recordatorio_reserva" : `reserva_${estado}`,
          mensaje: accion === "recordatorio"
            ? `Recordatorio enviado a ${reserva.turista?.nombre || "cliente"} para ${reserva.propiedadTitulo}.`
            : `Reserva para ${reserva.propiedadTitulo} ${estado}.`,
          fechaCreacion: new Date().toISOString(),
        });
      }
    } catch (error) {
      setError(error.message || "No se pudo conectar con el servidor");
    } finally {
      setAccionandoId("");
    }
  };

  const guardarEdicion = (prop) => {
    setPropiedades((prev) =>
      prev.map((p) =>
        String(p._id) === String(prop._id || prop.id)
          ? {
              ...p,
              titulo: prop.titulo,
              descripcion: prop.descripcion,
              direccion: prop.direccion,
              maxHuespedes: Number(prop.maxHuespedes),
              precioPorNoche: Number(prop.precioPorNoche),
              estado: prop.estado,
            }
          : p
      )
    );
    setMensaje("Propiedad actualizada correctamente");
  };

  const eliminar = (prop) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta propiedad?")) return;
    setPropiedades((prev) => prev.filter((p) => String(p._id) !== String(prop._id || prop.id)));
    setMensaje("Propiedad eliminada");
  };

  const editarCampo = (id, campo, valor) =>
    setPropiedades((prev) =>
      prev.map((p) => (String(p._id) === String(id) ? { ...p, [campo]: valor } : p))
    );

  const propiedadNombre = (id) =>
    propiedades.find((p) => String(p._id) === String(id))?.titulo || "-";

  return (
    <div className="panel-propietario">
      <header className="panel-header">
        <div>
          <p className="panel-kicker">GoyaQuintas Premium</p>
          <h1>Panel de Gestión Premium</h1>
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
                  <span className={`estado-badge ${p.estado === "pending_review" ? "pendiente" : "aprobada"}`}>
                    {p.estado === "pending_review" ? "Bajo revisión ⏳" : "Aprobada 🟢"}
                  </span>
                </div>
                <div className="propiedad-row-fields">
                  <input className="form-input" value={p.titulo} onChange={(e) => editarCampo(p._id, "titulo", e.target.value)} placeholder="Título" />
                  <input className="form-input" type="number" min="0" value={p.precioPorNoche} onChange={(e) => editarCampo(p._id, "precioPorNoche", e.target.value)} placeholder="Precio" />
                  <input className="form-input" value={p.descripcion} onChange={(e) => editarCampo(p._id, "descripcion", e.target.value)} placeholder="Descripción" />
                  <input className="form-input" value={p.direccion} onChange={(e) => editarCampo(p._id, "direccion", e.target.value)} placeholder="Dirección" />
                  <input className="form-input" type="number" min="1" value={p.maxHuespedes} onChange={(e) => editarCampo(p._id, "maxHuespedes", e.target.value)} placeholder="Huéspedes" />
                  <select className="form-input" value={p.estado} onChange={(e) => editarCampo(p._id, "estado", e.target.value)}>
                    <option value="pending_review">Bajo revisión</option>
                    <option value="disponible">Aprobada / Disponible</option>
                  </select>
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
                    <td>{r.estado || "confirmada"}</td>
                    <td className="reserva-actions">
                      <div>
                        {(r.estado || "confirmada") === "pendiente" ? (
                          <>
                            <button
                              className="btn-primary chico"
                              onClick={() => gestionarReserva(r, "confirmar")}
                              disabled={accionandoId === (r.id || r._id)}
                            >
                              Confirmar
                            </button>
                            <button
                              className="btn-danger chico"
                              onClick={() => gestionarReserva(r, "rechazar")}
                              disabled={accionandoId === (r.id || r._id)}
                            >
                              Rechazar
                            </button>
                          </>
                        ) : r.estado === "confirmada" ? (
                          <button
                            className="btn-secondary chico"
                            onClick={() => gestionarReserva(r, "recordatorio")}
                            disabled={accionandoId === (r.id || r._id)}
                          >
                            Enviar Recordatorio
                          </button>
                        ) : (
                          <span className="nota">Sin acciones</span>
                        )}
                      </div>
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
