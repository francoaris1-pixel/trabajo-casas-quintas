import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const fmt = (n) => "$" + Number(n).toLocaleString("es-AR");

const QUICK_FILTERS = [
  { key: "pileta", label: "Pileta" },
  { key: "mascotas", label: "Mascotas" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "parking", label: "Estacionamiento" },
];

function getPropertyImages(property) {
  const images = [
    ...(Array.isArray(property.imagenes) ? property.imagenes : []),
    ...(Array.isArray(property.fotos) ? property.fotos : []),
  ]
    .map((image) =>
      typeof image === "string" ? image : image?.archivo || image?.url || image?.src
    )
    .filter((image) => typeof image === "string" && image.trim());
  const primaryImage = property.foto || property.imagen;
  if (typeof primaryImage === "string" && primaryImage.trim()) {
    images.unshift(primaryImage);
  }
  return [...new Set(images)];
}

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
    : "Zona Sur";
  return {
    id: p._id,
    titulo,
    ubicacion: direccion,
    precio: p.precioPorNoche || 0,
    imagenes: getPropertyImages(p),
    specs,
    tipo,
    zona,
    pileta,
    mascotas,
    wifi,
    parking,
    estado: p.estado || "",
    descripcion: p.descripcion || "",
    rating: p.rating || 5,
  };
}

export default function Home({
  irALogin,
  usuario: usuarioProp,
}) {
  const [usuario, setUsuario] = useState(usuarioProp || null);
  const [propiedadDetalle, setPropiedadDetalle] = useState(null);
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [imagenDetalleError, setImagenDetalleError] = useState(false);
  useEffect(() => {
    if (!propiedadDetalle) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setPropiedadDetalle(null);
      if (event.key === "ArrowLeft" && propiedadDetalle.imagenes.length > 1) {
        event.preventDefault();
        setIndiceImagen((index) =>
          (index - 1 + propiedadDetalle.imagenes.length) %
          propiedadDetalle.imagenes.length
        );
      }
      if (event.key === "ArrowRight" && propiedadDetalle.imagenes.length > 1) {
        event.preventDefault();
        setIndiceImagen((index) => (index + 1) % propiedadDetalle.imagenes.length);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [propiedadDetalle]);
  useEffect(() => {
    setIndiceImagen(0);
    setImagenDetalleError(false);
  }, [propiedadDetalle]);
  useEffect(() => {
    setImagenDetalleError(false);
  }, [indiceImagen]);
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
    let active = true;
    api("/api/propiedades")
      .then((items) => {
        if (active) setPropiedades(items.map(mapPropiedad));
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || "No se pudieron cargar las propiedades");
        }
      })
      .finally(() => {
        if (active) setCargando(false);
      });
    return () => {
      active = false;
    };
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
      <section className="home-hero" aria-labelledby="home-hero-title">
        <img
          className="home-hero-image"
          src="/images/goya-turismo-hero.png"
          alt="Atardecer junto al río en Goya"
        />
        <div className="home-hero-overlay" aria-hidden="true" />
        <div className="home-hero-content">
          <span className="home-hero-eyebrow">Corrientes · Argentina</span>
          <h1 id="home-hero-title">
            Goya
            <span>Recibe</span>
          </h1>
        </div>
      </section>

      <p className="home-description">
        Plataforma para reservar alquileres de Casas, Quintas y Cabañas para turismo local.
      </p>

      <section className="mt-filterbar">
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
            <option value="Zona Sur">Zona Sur</option>
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
                {p.imagenes[0] ? (
                  <img
                    className="mt-card-img"
                    src={p.imagenes[0]}
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
                {p.imagenes[0] && (
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
        <div
          className="modal-overlay property-detail-overlay"
          onClick={() => setPropiedadDetalle(null)}
        >
          <div
            className="modal-card property-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="property-detail-modal-header">
              <button
                type="button"
                className="btn-secondary property-detail-close"
                onClick={() => setPropiedadDetalle(null)}
                aria-label="Cerrar detalles de la propiedad"
                autoFocus
              >
                Cerrar
              </button>
            </div>
            <div className="property-detail-content">
              <h3 id="property-detail-title">{propiedadDetalle.titulo}</h3>
              <p>{propiedadDetalle.ubicacion}</p>
              <p>{propiedadDetalle.descripcion}</p>
              <p>{fmt(propiedadDetalle.precio)} / noche</p>
              <p>{propiedadDetalle.specs.join(" • ")}</p>
              <div className="property-image-carousel">
                {propiedadDetalle.imagenes.length > 0 && !imagenDetalleError ? (
                  <img
                    className="property-detail-image"
                    src={propiedadDetalle.imagenes[indiceImagen]}
                    alt={`${propiedadDetalle.titulo}, imagen ${indiceImagen + 1}`}
                    onError={() => setImagenDetalleError(true)}
                  />
                ) : (
                  <div className="property-detail-image-fallback" role="img" aria-label="Imagen no disponible">
                    <svg viewBox="0 0 64 64" aria-hidden="true">
                      <rect x="8" y="12" width="48" height="40" rx="5" />
                      <circle cx="23" cy="27" r="5" />
                      <path d="m12 47 15-14 9 8 6-6 10 12" />
                    </svg>
                    <span>Imagen no disponible</span>
                  </div>
                )}
                {propiedadDetalle.imagenes.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="property-carousel-arrow property-carousel-prev"
                      onClick={() =>
                        setIndiceImagen(
                          (indiceImagen - 1 + propiedadDetalle.imagenes.length) %
                            propiedadDetalle.imagenes.length
                        )
                      }
                      aria-label="Ver imagen anterior"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="property-carousel-arrow property-carousel-next"
                      onClick={() =>
                        setIndiceImagen((indiceImagen + 1) % propiedadDetalle.imagenes.length)
                      }
                      aria-label="Ver imagen siguiente"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}
                <span className="property-carousel-counter" aria-live="polite">
                  {propiedadDetalle.imagenes.length
                    ? `${indiceImagen + 1} / ${propiedadDetalle.imagenes.length}`
                    : "1 / 1"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// Force redeploy 2026-10-28
