import React, { useEffect, useState } from "react";

const API = "";

const fmtMoney = (n) => "$" + Number(n || 0).toLocaleString("es-AR");
const fmtDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
};

export default function PanelPropietario({ usuario }) {
  const [propiedades, setPropiedades] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [estadisticas, setEstadisticas] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [nueva, setNueva] = useState({
    titulo: "",
    descripcion: "",
    direccion: "",
    maxHuespedes: "4",
    precioPorNoche: "",
    estado: "pending_review",
  });

  const cargarPanel = async () => {
    setCargando(true);
    try {
      const [resProps, resReservas] = await Promise.all([
        fetch(`${API}/api/propiedades/propietario/${usuario?.id || ""}`),
        fetch(`${API}/api/reservas/propietario/${usuario?.id || ""}`),
      ]);
      const propsData = await resProps.json();
      const reservasData = await resReservas.json();
      const props = Array.isArray(propsData) ? propsData : [];
      const reservasList = Array.isArray(reservasData) ? reservasData : [];
      setPropiedades(props);
      setReservas(reservasList);
      const stats = props.map((p) => {
        const rs = reservasList.filter(
          (r) => String(r.propiedadId || r.propiedad?._id || r.propiedad) === String(p._id || p.id)
        );
        const noches = rs.reduce((t, r) => {
          const ini = new Date(r.checkIn || r.fechaInicio);
          const fin = new Date(r.checkOut || r.fechaFin);
          if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime())) return t;
          return t + Math.max(1, Math.round((fin - ini) / 86400000));
        }, 0);
        return {
          propiedadId: p._id || p.id,
          titulo: p.titulo,
          precioPorNoche: p.precioPorNoche,
          reservas: rs.length,
          noches,
          ingresos: noches * (p.precioPorNoche || 0),
          liquidacion: noches * (p.precioPorNoche || 0) * 0.9,
        };
      });
      setEstadisticas(stats);
    } catch {
      setMensaje("No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
  };
  };

  useEffect(() => {
    cargarPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  const totalNoches = estadisticas.reduce((t, e) => t + (e.noches || 0), 0);
  const totalIngresos = estadisticas.reduce((t, e) => t + (e.ingresos || 0), 0);
  const totalLiquidacion = estadisticas.reduce((t, e) => t + (e.liquidacion || 0), 0);

  const publicar = async (e) => {
    e.preventDefault();
    setMensaje("");
    setGuardando(true);
    try {
      const res = await fetch(`${API}/api/propiedades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-usuario-id": usuario?.id || "",
        },
        body: JSON.stringify(nueva),
      });
      const datos = await res.json();
      setMensaje(res.ok ? datos.mensaje : datos.error);
      if (res.ok) {
        setNueva({
          titulo: "",
          descripcion: "",
          direccion: "",
          maxHuespedes: "4",
          precioPorNoche: "",
          estado: "pending_review",
        });
        cargarPanel();
      }
    } catch {
      setMensaje("No se pudo conectar con el servidor");
    } finally {
      setGuardando(false);
    }
  };

  const guardarEdicion = async (prop) => {
    setMensaje("");
    try {
      const res = await fetch(`${API}/api/propiedades/${prop._id || prop.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-usuario-id": usuario?.id || "",
        },
        body: JSON.stringify(prop),
      });
      const datos = await res.json();
      setMensaje(res.ok ? datos.mensaje : datos.error);
      if (res.ok) cargarPanel();
    } catch {
      setMensaje("No se pudo conectar con el servidor");
    }
  };

  const eliminar = async (prop) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta propiedad?")) return;
    setMensaje("");
    try {
      const res = await fetch(`${API}/api/admin/propiedades/${prop._id || prop.id}`, {
        method: "DELETE",
      });
      const datos = await res.json();
      setMensaje(res.ok ? datos.mensaje : datos.error);
      if (res.ok) cargarPanel();
    } catch {
      setMensaje("No se pudo conectar con el servidor");
    }
  };

  const editarCampo = (id, campo, valor) =>
    setPropiedades((prev) =>
      prev.map((p) => (String(p._id || p.id) === String(id) ? { ...p, [campo]: valor } : p))
    );

  const propiedadNombre = (id) =>
    propiedades.find((p) => String(p._id || p.id) === String(id))?.titulo || "-";

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

      <section className="panel-card">
        <div className="panel-card-header">
          <h2>Publicar propiedad nueva</h2>
          <p className="nota">Completa los datos para enviar tu quinta a revisión.</p>
        </div>
        <form className="form-grid" onSubmit={publicar}>
          <div className="form-field">
            <label className="form-label" htmlFor="pub-titulo">Título</label>
            <input
              id="pub-titulo"
              className="form-input"
              placeholder="Ej: Quinta Los Lapachos"
              value={nueva.titulo}
              onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pub-direccion">Dirección / Zona</label>
            <input
              id="pub-direccion"
              className="form-input"
              placeholder="Zona Norte, Goya, Corrientes"
              value={nueva.direccion}
              onChange={(e) => setNueva({ ...nueva, direccion: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pub-huespedes">Máx. huéspedes</label>
            <input
              id="pub-huespedes"
              className="form-input"
              type="number"
              min="1"
              value={nueva.maxHuespedes}
              onChange={(e) => setNueva({ ...nueva, maxHuespedes: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pub-precio">Precio por noche</label>
            <input
              id="pub-precio"
              className="form-input"
              type="number"
              min="0"
              placeholder="85000"
              value={nueva.precioPorNoche}
              onChange={(e) => setNueva({ ...nueva, precioPorNoche: e.target.value })}
              required
            />
          </div>
          <div className="form-field form-field-wide">
            <label className="form-label" htmlFor="pub-descripcion">Descripción</label>
            <input
              id="pub-descripcion"
              className="form-input"
              placeholder="Quinta con pileta, wifi y cochera"
              value={nueva.descripcion}
              onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })}
              required
            />
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
          <strong className="stat-value">{totalNoches}</strong>
        </article>
        <article className="stat-card stat-green">
          <span className="stat-label">Ingresos brutos</span>
          <strong className="stat-value">{fmtMoney(totalIngresos)}</strong>
        </article>
        <article className="stat-card stat-violet">
          <span className="stat-label">Monto a liquidar (90%)</span>
          <strong className="stat-value">{fmtMoney(totalLiquidacion)}</strong>
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
            {propiedades.map((p) => {
              const stat = estadisticas.find((e) => String(e.propiedadId) === String(p._id || p.id));
              const estadoTexto =
                p.estado === "pending_review" ? "Bajo revisión ⏳" : "Aprobada 🟢";
              return (
                <article className="propiedad-row" key={p._id || p.id}>
                  <div className="propiedad-row-main">
                    <div>
                      <h3>{p.titulo}</h3>
                      <p className="nota">{p.direccion || "Sin dirección"}</p>
                    </div>
                    <span className={`estado-badge ${p.estado === "pending_review" ? "pendiente" : "aprobada"}`}>
                      {estadoTexto}
                    </span>
                  </div>
                  <div className="propiedad-row-fields">
                    <input
                      className="form-input"
                      value={p.titulo}
                      onChange={(e) => editarCampo(p._id || p.id, "titulo", e.target.value)}
                      placeholder="Título"
                    />
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      value={p.precioPorNoche}
                      onChange={(e) => editarCampo(p._id || p.id, "precioPorNoche", e.target.value)}
                      placeholder="Precio"
                    />
                    <input
                      className="form-input"
                      value={p.descripcion}
                      onChange={(e) => editarCampo(p._id || p.id, "descripcion", e.target.value)}
                      placeholder="Descripción"
                    />
                    <input
                      className="form-input"
                      value={p.direccion}
                      onChange={(e) => editarCampo(p._id || p.id, "direccion", e.target.value)}
                      placeholder="Dirección"
                    />
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      value={p.maxHuespedes}
                      onChange={(e) => editarCampo(p._id || p.id, "maxHuespedes", e.target.value)}
                      placeholder="Huéspedes"
                    />
                    <select
                      className="form-input"
                      value={p.estado}
                      onChange={(e) => editarCampo(p._id || p.id, "estado", e.target.value)}
                    >
                      <option value="pending_review">Bajo revisión</option>
                      <option value="disponible">Aprobada / Disponible</option>
                    </select>
                    <div className="row-actions">
                      <button
                        className="btn-primary chico"
                        onClick={() =>
                          guardarEdicion({
                            ...p,
                            precioPorNoche: Number(p.precioPorNoche),
                            maxHuespedes: Number(p.maxHuespedes),
                          })
                        }
                      >
                        Guardar
                      </button>
                      <button className="btn-danger chico" onClick={() => eliminar(p)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {stat && (
                    <p className="nota">
                      Reservas: {stat.reservas} · Noches: {stat.noches} · Ingresos: {fmtMoney(stat.ingresos)}
                    </p>
                  )}
                </article>
              );
            })}
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
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r._id || r.id}>
                    <td>{r.propiedad?.titulo || propiedadNombre(r.propiedad?._id || r.propiedad)}</td>
                    <td>{r.turista?.nombre || "-"} {r.turista?.apellido || ""}</td>
                    <td>{r.turista?.telefono || "-"}</td>
                    <td>{fmtDate(r.fechaInicio)}</td>
                    <td>{fmtDate(r.fechaFin)}</td>
                    <td>{r.estado || "confirmada"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cargando && <p className="nota">Cargando panel...</p>}
    </div>
  );
}


