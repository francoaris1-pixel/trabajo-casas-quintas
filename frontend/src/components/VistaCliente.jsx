import React, { useEffect, useMemo, useState } from "react";
import { MOCK_RESERVATIONS } from "../mockData.js";

const API = "";

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
      for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
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
        <button onClick={() => avanzar(-1)}>â€¹</button>
        <strong>
          {MESES[mes]} {anio}
        </strong>
        <button onClick={() => avanzar(1)}>â€º</button>
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

export default function VistaCliente({ usuario, propiedades }) {
  const [seleccionada, setSeleccionada] = useState("");
  const [reservas, setReservas] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({ desde: "", hasta: "", metodoPago: "efectivo" });
  const [misReservas, setMisReservas] = useState([]);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [confirmarId, setConfirmarId] = useState(null);

  const cargarReservas = (id) => {
    if (!id) return;
    const propertyReservations = MOCK_RESERVATIONS.filter(
      (r) => String(r.propiedadId) === String(id) && r.estado !== "cancelada"
    );
    setReservas(propertyReservations);
  };

  const cargarMisReservas = () => {
    if (!usuario?.id) return;
    const mine = MOCK_RESERVATIONS.filter((r) => String(r.turista?._id) === String(usuario.id));
    setMisReservas(mine);
  };

  const cancelarReserva = (id) => {
    setCancelandoId(id);
    const index = MOCK_RESERVATIONS.findIndex((r) => String(r.id || r._id) === String(id));
    if (index >= 0) MOCK_RESERVATIONS[index].estado = "cancelada";
    setMisReservas((prev) =>
      prev.map((r) => (String(r.id || r._id) === String(id) ? { ...r, estado: "cancelada" } : r))
    );
    setReservas((prev) => prev.filter((r) => String(r.id || r._id) !== String(id)));
    setMensaje("Reserva cancelada correctamente");
    setCancelandoId(null);
    setConfirmarId(null);
  };

  useEffect(() => {
    cargarReservas(seleccionada);
  }, [seleccionada]);

  useEffect(() => {
    cargarMisReservas();
  }, [usuario?.id]);

  // Si cambia la lista de propiedades (ej: al loguear) ajusto la seleccion
  useEffect(() => {
    const lista = Array.isArray(propiedades) ? propiedades : [];
    if (lista.length && !lista.some((p) => p._id === seleccionada)) {
      setSeleccionada(lista[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propiedades]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!usuario?.id || !seleccionada) {
      setError("Faltan datos para crear la reserva");
      return;
    }

    const propiedad = listaPropiedades.find((p) => p._id === seleccionada);
    if (!propiedad) {
      setError("Propiedad no encontrada");
      return;
    }

    const noches = Math.max(
      1,
      Math.round((new Date(form.hasta) - new Date(form.desde)) / 86400000)
    );
    const nuevaReserva = {
      id: `r-${Date.now()}`,
      _id: `r-${Date.now()}`,
      propiedadId: seleccionada,
      propiedadTitulo: propiedad.titulo,
      turista: {
        _id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        telefono: usuario.telefono,
      },
      checkIn: form.desde,
      checkOut: form.hasta,
      montoTotal: noches * (propiedad.precioPorNoche || 0),
      estado: "confirmada",
    };

    MOCK_RESERVATIONS.push(nuevaReserva);
    setReservas((prev) => [...prev, nuevaReserva]);
    setMisReservas((prev) => [...prev, nuevaReserva]);
    setForm({ desde: "", hasta: "", metodoPago: "efectivo" });
    setMensaje("Reserva registrada correctamente");
  };

  const listaPropiedades = Array.isArray(propiedades) ? propiedades : [];
  const listaMisReservas = Array.isArray(misReservas) ? misReservas : [];

  const propiedad = listaPropiedades.find((p) => p._id === seleccionada);

  console.log("=== DIAGNÓSTICO CLINE (VistaCliente) ===", { usuario, propiedades, reservas, misReservas });
  return (
    <section className="cliente">
      <h2>Propiedades disponibles</h2>
      <p className="nota">
        Hola {usuario?.nombre}. Elegi una propiedad para ver disponibilidad y reservar.
      </p>

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
              <button className="btn-primary">Reservar</button>
            </form>
            </div>
            {mensaje && <p className="ok">{mensaje}</p>}
            {error && <p className="error">{error}</p>}
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

