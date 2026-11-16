const TOKEN_KEY = "authToken";
const LEGACY_AUTH_KEYS = [TOKEN_KEY, "user"];

export function clearLegacyAuthData() {
  try {
    LEGACY_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn("No se pudieron limpiar los datos de autenticación anteriores", error);
  }
}

export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...options, headers });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("El servidor devolvio una respuesta invalida");
    }
  }
  if (!response.ok) {
    throw new Error(data.error || `Error del servidor (${response.status})`);
  }
  return data;
}
