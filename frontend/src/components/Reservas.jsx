import React, { useState } from "react";

export default function Reservas({ usuario, propiedades }) {
  const listaPropiedades = Array.isArray(propiedades) ? propiedades : [];
  const [mensaje, setMensaje] = useState("");
  const [form, setForm] = useState({
    propiedadId: listaPropiedades[0]?.id || "",
    nombre: "",
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

    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const datos = await res.json();
      setMensaje(res.ok ? datos.mensaje : datos.error);
    } catch {
      setMensaje("No se pudo conectar con el servidor");
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
            <div className="card" key={p.id}>
              <h3>{p.nombre}</h3>
              <p>{p.descripcion}</p>
              <p className="precio">${p.precioPorDia} por dia</p>
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
            <option key={p.id} value={p.id}>
              {p.nombre}
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
          name="telefono"
          placeholder="Telefono (opcional)"
          value={form.telefono}
          onChange={handleChange}
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
    </section>
  );
}

