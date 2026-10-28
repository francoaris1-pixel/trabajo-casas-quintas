import React, { useEffect, useState } from "react";
import { MOCK_PROPERTIES } from "../mockData.js";

const API = "";

const fmt = (n) => "$" + Number(n).toLocaleString("es-AR");

const QUICK_FILTERS = [
  { key: "pileta", label: "Pileta" },
  { key: "mascotas", label: "Mascotas" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "parking", label: "Estacionamiento" },
];

function mapPropiedad(p) {
  const descripcion = (p.descripcion || "").toLowerCase();
  const pileta = descripcion.includes("pileta");
  const mascotas = descripcion.includes("mascota");
  const wifi = descripcion.includes("wifi");
  const parking =
    descripcion.includes("cochera") ||
    descripcion.includes("parking") ||
    descripcion.includes("estacionamiento");
  const specs = [`${p.maxHuespedes || 0} huespedes max.`];
  if (pileta) specs.push("Con Pileta");
  if (mascotas) specs.push("Mascotas");
  if (wifi) specs.push("Wi-Fi");
  if (parking) specs.push("Cochera");
  const titulo = p.titulo || "Propiedad";
  const tipo = titulo.toLowerCase().includes("quinta")
    ? "Quinta"
    : titulo.toLowerCase().includes("chalet")
    ? "Casa"
    : titulo.toLowerCase().includes("cabana") || titulo.toLowerCase().includes("cabaña")
    ? "Cabana"
    : "Casa";
  const direccion = p.direccion || "";
  const zona = direccion.toLowerCase().includes("centro")
    ? "Centro"
    : direccion.toLowerCase().includes("norte")
    ? "Norte"
    : "Goya";
  return {
    id: p._id,
    titulo,
    ubicacion: direccion,
    precio: p.precioPorNoche || 0,
    imagen: p.foto || null,
    specs,
    tipo,
    zona,
    pileta,
    mascotas,
    wifi,
    parking,
    estado: p.estado || "",
  };
}

export default function Home({ irALogin, usuario: usuarioProp }) {
  const [usuario, setUsuario] = useState(() => {
    if (usuarioProp !== undefined) return usuarioProp;
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [propiedadDetalle, setPropiedadDetalle] = useState(null);
  useEffect(() => {
    if (usuarioProp !== undefined) setUsuario(usuarioProp);
  }, [usuarioProp]);
  const [propiedades, setPropiedades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tipo, setTipo] = useState("Todos");
  const [zona, setZona] = useState("Todas");
  const [filtros, setFiltros] = useState({
    pileta: false,
    mascotas: false,
    wifi: false,
    parking: false,
  });
  const [favoritos, setFavoritos] = useState(new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPropiedades(MOCK_PROPERTIES.map(mapPropiedad));
      setCargando(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleFiltro = (key) =>
    setFiltros((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleFav = (id) =>
    setFavoritos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleImgError = (e) => {
    e.currentTarget.classList.add("hidden");
    const placeholder = e.currentTarget.nextElementSibling;
    if (placeholder) placeholder.classList.add("visible");
  };

  const resultados = propiedades.filter((p) => {
    const coincideTipo = tipo === "Todos" || p.tipo === tipo;
    const coincideZona = zona === "Todas" || p.zona === zona;
    const coincideFiltros = QUICK_FILTERS.every(
      (f) => !filtros[f.key] || p[f.key]
    );
    return coincideTipo && coincideZona && coincideFiltros;
  });

  return (
    <>
    <div className="mitula-home">
      <div className="mt-topbar">
        <div className="mt-brand">
          Goya Recibe
        </div>
      </div>

      <section className="mt-filterbar">
        <div className="mt-filter-title">Goya Recibe en alquiler</div>

        <div className="mt-quick-filters">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`mt-quick-btn ${filtros[f.key] ? "active" : ""}`}
              onClick={() => toggleFiltro(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-dropdowns">
          <select
            className="mt-select"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="Todos">Tipo de propiedad</option>
            <option value="Quinta">Quinta</option>
            <option value="Casa">Casa</option>
            <option value="Cabana">Cabana</option>
          </select>

          <select
            className="mt-select"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
          >
            <option value="Todas">Zona</option>
            <option value="Norte">Zona Norte</option>
            <option value="Centro">Centro</option>
            <option value="Goya">Goya</option>
          </select>

          <button className="mt-search-btn">Buscar</button>
        </div>
      </section>

      {cargando && <div className="mt-empty">Cargando propiedades...</div>}
      {!cargando && error && <div className="mt-empty">{error}</div>}
      {!cargando && !error && resultados.length === 0 && (
        <div className="mt-empty">
          No se encontraron propiedades para los filtros seleccionados.
        </div>
      )}

      {!cargando && !error && resultados.length > 0 && (
        <section className="mt-results">
          {resultados.map((p) => (
            <article className="mt-card" key={p.id}>
              <div className="mt-card-img-wrap">
                {p.imagen ? (
                  <img
                    className="mt-card-img"
                    src={p.imagen}
                    alt={p.titulo}
                    onError={handleImgError}
                  />
                ) : (
                  <div className="mt-card-placeholder visible">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <span>Imagen no disponible</span>
                  </div>
                )}
                {p.imagen && (
                  <div className="mt-card-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <span>Imagen no disponible</span>
                  </div>
                )}

                <button
                  className={`mt-fav-btn ${favoritos.has(p.id) ? "active" : ""}`}
                  onClick={() => toggleFav(p.id)}
                  aria-label="Agregar a favoritos"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>

              <div className="mt-card-body">
                <h3 className="mt-card-title">{p.titulo}</h3>
                <div className="mt-rating">
                  {"★".repeat(Math.round(p.rating || 5))}
                  <span>{Number(p.rating || 5).toFixed(1)}</span>
                </div>

                <div className="mt-price-row">
                  <span className="mt-price">{fmt(p.precio)}</span>
                  <span className="mt-price-unit">/ noche</span>
                </div>

                <p className="mt-card-specs">
                  {p.specs.map((s, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="sep">•</span>}
                      {s}
                    </React.Fragment>
                  ))}
                </p>

                <p className="mt-card-location">{p.ubicacion}</p>
                {p.estado && (
                  <p className="mt-card-location">Estado: {p.estado}</p>
                )}

                <button className="mt-card-cta" onClick={() => (usuario ? setPropiedadDetalle(p) : irALogin())}>
                  Ver detalles
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>

      {propiedadDetalle && (
        <div className="modal-overlay" onClick={() => setPropiedadDetalle(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{propiedadDetalle.titulo}</h3>
            <p>{propiedadDetalle.ubicacion}</p>
            <p>{fmt(propiedadDetalle.precio)} / noche</p>
            <p>{propiedadDetalle.specs.join(" • ")}</p>
            {propiedadDetalle.imagen && (
              <img
                src={propiedadDetalle.imagen}
                alt={propiedadDetalle.titulo}
                style={{ maxWidth: "100%", borderRadius: "8px", marginTop: "8px" }}
                onError={(e) => e.currentTarget.classList.add("hidden")}
              />
            )}
            <div className="modal-actions" style={{ marginTop: "12px" }}>
              <button className="btn-secondary" onClick={() => setPropiedadDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


