import React, { useState } from "react";

export default function Reservas({ usuario, propiedades, onNotification }) {
  const listaPropiedades = Array.isArray(propiedades) ? propiedades : [];
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    propiedadId: listaPropiedades[0]?._id || listaPropiedades[0]?.id || "",
    nombre: "",
    correo: "",
    telefono: "",
    desde: "",
    hasta: "",
  });

  const esAdmin = usuario?.rol === "anfitrion";

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propiedadId: form.propiedadId,
          checkIn: form.desde,
          checkOut: form.hasta,
          datosTurista: {
            nombre: form.nombre.trim(),
            correo: form.correo.trim(),
            telefono: form.telefono.trim(),
          },
        }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error || "No se pudo registrar la reserva");
      setMensaje(`${datos.mensaje}. Pendiente de confirmación.`);
      onNotification?.(datos.evento);
    } catch (submitError) {
      setError(submitError.message || "No se pudo conectar con el servidor");
    }
  };

  return (
    <section className="reservas">
      <h2>
        {esAdmin
          ? "Administrador - todas las propiedades"
          : `Propiedades de ${usuario?.nombre || "usuario"}`}
      </h2>

      {listaPropiedades.length === 0 ? (
        <p className="nota">
          Â¡AÃºn no tienes reservas! Explora las casas quintas disponibles en Goya para realizar tu primer alquiler.
        </p>
      ) : (
        <div className="cards">
          {listaPropiedades.map((p) => (
            <div className="card" key={p._id || p.id}>
              <h3>{p.titulo || p.nombre}</h3>
              <p>{p.descripcion}</p>
              <p className="precio">${p.precioPorNoche ?? p.precioPorDia} por día</p>
            </div>
          ))}
        </div>
      )}

      <h3>Nueva reserva</h3>
      <form className="form-reserva" onSubmit={handleSubmit}>
        <select
          name="propiedadId"
          value={form.propiedadId}
          onChange={handleChange}
          required
        >
          {listaPropiedades.map((p) => (
            <option key={p._id || p.id} value={p._id || p.id}>
              {p.titulo || p.nombre}
            </option>
          ))}
        </select>
        <input
          name="nombre"
          placeholder="Nombre del cliente"
          value={form.nombre}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="correo"
          placeholder="Correo electrónico"
          value={form.correo}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="telefono"
          placeholder="Teléfono"
          value={form.telefono}
          onChange={handleChange}
          required
        />
        <label>
          Desde:{" "}
          <input type="date" name="desde" value={form.desde} onChange={handleChange} required />
        </label>
        <label>
          Hasta:{" "}
          <input type="date" name="hasta" value={form.hasta} onChange={handleChange} required />
        </label>
        <button className="btn-primary">Guardar reserva</button>
      </form>
      {mensaje && <p className="ok">{mensaje}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

