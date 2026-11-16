// Datos iniciales (luego se pueden mover a una base de datos)
export const usuarios = [
  { usuario: "admin", nombre: "Administrador", rol: "admin" },
  { usuario: "anfitrion1", nombre: "Anfitrion 1", rol: "anfitrion" },
  { usuario: "anfitrion2", nombre: "Anfitrion 2", rol: "anfitrion" },
  { usuario: "anfitrion3", nombre: "Anfitrion 3", rol: "anfitrion" },
];

export const propiedades = [
  {
    id: 1,
    nombre: "Casa del Lago",
    tipo: "casa",
    propietario: "anfitrion1",
    descripcion: "Casa amplia con pileta y vista al lago",
    precioPorDia: 35000,
  },
  {
    id: 2,
    nombre: "Quinta Los Alamos",
    tipo: "quinta",
    propietario: "anfitrion2",
    descripcion: "Quinta con quincho, pileta y gran parque",
    precioPorDia: 28000,
  },
  {
    id: 3,
    nombre: "Casa del Bosque",
    tipo: "casa",
    propietario: "anfitrion3",
    descripcion: "Casa comoda entre arboledas, ideal familias",
    precioPorDia: 30000,
  },
];

export const reservas = [];
