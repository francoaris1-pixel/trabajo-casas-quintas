// Datos iniciales (luego se pueden mover a una base de datos)
export const usuarios = [
  { usuario: "admin", password: "admin123", nombre: "Administrador", rol: "admin" },
  { usuario: "propietario1", password: "pass1", nombre: "Propietario 1", rol: "propietario" },
  { usuario: "propietario2", password: "pass2", nombre: "Propietario 2", rol: "propietario" },
  { usuario: "propietario3", password: "pass3", nombre: "Propietario 3", rol: "propietario" },
];

export const propiedades = [
  {
    id: 1,
    nombre: "Casa del Lago",
    tipo: "casa",
    propietario: "propietario1",
    descripcion: "Casa amplia con pileta y vista al lago",
    precioPorDia: 35000,
  },
  {
    id: 2,
    nombre: "Quinta Los Alamos",
    tipo: "quinta",
    propietario: "propietario2",
    descripcion: "Quinta con quincho, pileta y gran parque",
    precioPorDia: 28000,
  },
  {
    id: 3,
    nombre: "Casa del Bosque",
    tipo: "casa",
    propietario: "propietario3",
    descripcion: "Casa comoda entre arboledas, ideal familias",
    precioPorDia: 30000,
  },
];

export const reservas = [];
