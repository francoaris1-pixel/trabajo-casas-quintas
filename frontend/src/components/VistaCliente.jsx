import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

// Genera la grilla de un mes: de lunes a domingo
function grillaMes(anio, mes) {
  const primero = new Date(anio, mes, 1);
  const dias = new Date(anio, mes + 1, 0).getDate();
  const offset = (primero.getDay() + 6) % 7; // lunes = 0
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= dias; d++) celdas.push(d);
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const fechaLocalParaInput = () => {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
};

function Calendario({ reservas = [] }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());

  const listaReservas = Array.isArray(reservas) ? reservas : [];

  // Dias ocupados: marca desde check-in hasta check-out (inclusive)
  const ocupados = useMemo(() => {
    const set = new Set();
    for (const r of listaReservas) {
      if (!r || !r.checkIn || !r.checkOut) continue;
      const ini = new Date(r.checkIn);
      const fin = new Date(r.checkOut);
      if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime())) continue;
      for (let d = new Date(ini); d < fin; d.setUTCDate(d.getUTCDate() + 1)) {
        set.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`);
      }
    }
    return set;
  }, [listaReservas]);

  const avanzar = (delta) => {
    const nuevo = new Date(anio, mes + delta, 1);
    setAnio(nuevo.getFullYear());
    setMes(nuevo.getMonth());
  };

  const celdas = grillaMes(anio, mes);

  return (
    <div className="calendario">
      <div className="cal-header">
        <button
          type="button"
          onClick={() => avanzar(-1)}
          aria-label="Mes anterior"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <strong>
          {MESES[mes]} {anio}
        </strong>
        <button
          type="button"
          onClick={() => avanzar(1)}
          aria-label="Mes siguiente"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
      <div className="cal-grid">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className="cal-dia-nombre">
            {d}
          </span>
        ))}
        {celdas.map((d, i) => {
          if (d === null) return <span key={i} />;
          const ocupado = ocupados.has(`${anio}-${mes}-${d}`);
          const pasado =
            new Date(anio, mes, d) <
            new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
          return (
            <span
              key={i}
              className={`cal-dia ${ocupado ? "ocupado" : ""} ${pasado ? "pasado" : ""
                }`}
            >
              {d}
            </span>
          );
        })}
      </div>
      <div className="cal-leyenda">
        <span className="punto libre" /> Disponible
        <span className="punto ocupado" /> Ocupado
      </div>
    </div>
  );
}

export default function VistaCliente({ usuario }) {
  const [propiedades, setPropiedades] = useState([]);
  const [seleccionada, setSeleccionada] = useState("");
  const [reservas, setReservas] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({ desde: "", hasta: "", metodoPago: "efectivo" });
  const [misReservas, setMisReservas] = useState([]);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [confirmarId, setConfirmarId] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarMisReservas = async () => {
    const mine = await api("/api/reservas/mis");
    setMisReservas(mine);
  };

  useEffect(() => {
    let active = true;
    Promise.all([api("/api/propiedades"), api("/api/reservas/mis")])
      .then(([properties, mine]) => {
        if (!active) return;
        setPropiedades(properties);
        setMisReservas(mine);
        setSeleccionada(properties[0]?._id || "");
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "No se pudieron cargar los datos");
      })
      .finally(() => {
        if (active) setCargando(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!seleccionada) {
      setReservas([]);
      return;
    }
    let active = true;
    api(`/api/propiedades/${seleccionada}/reservas`)
      .then((items) => {
        if (active) {
          setReservas(items);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "No se pudo consultar la disponibilidad");
      });
    return () => {
      active = false;
    };
  }, [seleccionada]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");
    try {
      const result = await api("/api/reservas", {
        method: "POST",
        body: JSON.stringify({
          propiedadId: seleccionada,
          checkIn: form.desde,
          checkOut: form.hasta,
          metodoPago: form.metodoPago,
        }),
      });
      setForm({ desde: "", hasta: "", metodoPago: "efectivo" });
      setMensaje(result.mensaje);
      await Promise.all([
        cargarMisReservas(),
        api(`/api/propiedades/${seleccionada}/reservas`).then(setReservas),
      ]);
    } catch (requestError) {
      setError(requestError.message || "No se pudo registrar la reserva");
    }
  };

  const listaPropiedades = Array.isArray(propiedades) ? propiedades : [];
  const listaMisReservas = Array.isArray(misReservas) ? misReservas : [];

  const propiedad = listaPropiedades.find((p) => p._id === seleccionada);

  const cancelarReserva = async (id) => {
    setCancelandoId(id);
    setError("");
    try {
      const result = await api(`/api/reservas/${id}/cancelar`, { method: "PUT" });
      await Promise.all([
        cargarMisReservas(),
        api(`/api/propiedades/${seleccionada}/reservas`).then(setReservas),
      ]);
      setMensaje(result.mensaje);
      setConfirmarId(null);
    } catch (requestError) {
      setError(requestError.message || "No se pudo cancelar la reserva");
    } finally {
      setCancelandoId(null);
    }
  };
  return (
    <section className="cliente">
      <h2>Propiedades disponibles</h2>
      <p className="nota">
        Hola {usuario?.nombre}. Elegi una propiedad para ver disponibilidad y reservar.
      </p>
      {cargando && <p className="nota">Cargando propiedades y reservas...</p>}
      {error && <p className="error">{error}</p>}

      <div className="propiedades-grid">
        {listaPropiedades.map((p) => (
          <article
            className={`propiedad-card ${p._id === seleccionada ? "sel" : ""}`}
            key={p._id}
            onClick={() => setSeleccionada(p._id)}
          >
            <img
              className="propiedad-img"
              src={p.foto || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80"}
              alt={p.titulo}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="propiedad-body">
              <h3>{p.titulo}</h3>
              <p>{p.descripcion}</p>
              <p>{p.direccion}</p>
              <p>Max. huespedes: {p.maxHuespedes}</p>
              <p className="precio">${p.precioPorNoche} por noche</p>
            </div>
          </article>
        ))}
        {propiedades.length === 0 && (
          <p className="nota">No hay propiedades publicadas todavia.</p>
        )}
      </div>

      {propiedad && (
        <div className="detalle-propiedad">
          <div>
            <h3>{propiedad.titulo}</h3>
            <p>{propiedad.descripcion}</p>
            <p className="precio">${propiedad.precioPorNoche} por noche</p>
            <div className="reserva-form-card">
              <form className="form-reserva" onSubmit={handleSubmit}>
              <label>
                Check-in:{" "}
                <input
                  type="date"
                  name="desde"
                  min={fechaLocalParaInput()}
                  value={form.desde}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Check-out:{" "}
                <input
                  type="date"
                  name="hasta"
                  min={form.desde || fechaLocalParaInput()}
                  value={form.hasta}
                  onChange={handleChange}
                  required
                />
              </label>
              <select
                name="metodoPago"
                value={form.metodoPago}
                onChange={handleChange}
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta_debito">Tarjeta de debito</option>
                <option value="tarjeta_credito">Tarjeta de credito</option>
                <option value="transferencia_bancaria">Transferencia bancaria</option>
                <option value="billetera_virtual">Billetera virtual</option>
              </select>
              <button className="btn-primary" disabled={cargando}>Solicitar reserva</button>
            </form>
            <p className="nota">En esta etapa de prueba el pago queda pendiente; no se realiza ningun cobro.</p>
            </div>
            {mensaje && <p className="ok">{mensaje}</p>}
          </div>
          <Calendario reservas={reservas} />
        </div>
      )}
      <section className="mis-reservas">
        <h2>Mis reservas</h2>
        {listaMisReservas.length === 0 ? (
          <p className="nota">
            ¡Aún no tienes reservas! Explora las casas quintas disponibles en Goya para realizar tu primer alquiler.
          </p>
        ) : (
          <div className="reservas-lista">
            {listaMisReservas.map((r) => (
              <div className="reserva-card" key={r.id}>
                <div>
                  <h3>{r.propiedadTitulo}</h3>
                  <p>Desde: {String(r.checkIn).slice(0, 10)} hasta {String(r.checkOut).slice(0, 10)}</p>
                  <p>Monto: ${Number(r.montoTotal).toLocaleString("es-AR")}</p>
                  <p>Estado: {r.estado}</p>
                </div>
                {r.estado !== "cancelada" && (
                  <button className="btn-cancelar" onClick={() => setConfirmarId(r.id)} disabled={cancelandoId === r.id}>
                    {cancelandoId === r.id ? "Cancelando..." : "Cancelar Reserva"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {confirmarId && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Cancelar reserva</h3>
            <p>Seguro que quieres cancelar esta reserva? Las fechas volveran a estar disponibles.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmarId(null)}>No, mantener</button>
              <button className="btn-danger" onClick={() => cancelarReserva(confirmarId)} disabled={cancelandoId === confirmarId}>
                {cancelandoId === confirmarId ? "Cancelando..." : "Si, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
