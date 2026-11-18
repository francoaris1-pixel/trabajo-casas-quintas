import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";
import { Usuario } from "./models.js";

const scrypt = promisify(scryptCallback);
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const { valid } = await verifyPasswordWithMigration(password, storedHash);
  return valid;
}

export async function verifyPasswordWithMigration(password, storedHash) {
  const stored = String(storedHash || "");
  if (typeof password !== "string" || !password || !stored) {
    return { valid: false, needsMigration: false };
  }

  if (stored.startsWith("scrypt$")) {
    const [algorithm, saltHex, hashHex] = stored.split("$");
    if (
      algorithm !== "scrypt" ||
      !/^[0-9a-f]{32}$/i.test(saltHex) ||
      !/^[0-9a-f]{128}$/i.test(hashHex)
    ) {
      return { valid: false, needsMigration: false };
    }

    const expected = Buffer.from(hashHex, "hex");
    const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
    return {
      valid: expected.length === actual.length && timingSafeEqual(expected, actual),
      needsMigration: false,
    };
  }

  if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
    const valid = await bcrypt.compare(password, stored);
    return { valid, needsMigration: valid };
  }

  const valid = password === stored;
  return { valid, needsMigration: valid };
}

function tokenSecret() {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production"
      ? ""
      : "local-test-secret-change-before-deploy");
  if (
    !secret ||
    (process.env.NODE_ENV === "production" &&
      (secret.length < 32 || secret.startsWith("replace-")))
  ) {
    throw new Error("Configura JWT_SECRET con al menos 32 caracteres aleatorios");
  }
  return secret;
}

export function createToken(userId) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(userId),
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    })
  ).toString("base64url");
  const signature = createHmac("sha256", tokenSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyToken(token) {
  const [payload, signature, extra] = String(token || "").split(".");
  if (!payload || !signature || extra) return null;

  const expected = createHmac("sha256", tokenSecret())
    .update(payload)
    .digest();
  let actual;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.sub || !Number.isInteger(data.exp) || data.exp <= Date.now() / 1000) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function authenticate(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer (.+)$/i);
  const payload = match ? verifyToken(match[1]) : null;
  if (!payload) {
    return res.status(401).json({ error: "Sesion invalida o vencida" });
  }

  Usuario.findById(payload.sub)
    .then((user) => {
      if (!user) return res.status(401).json({ error: "Sesion invalida o vencida" });
      req.user = user;
      next();
    })
    .catch(next);
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: "No tenes permisos para esta accion" });
    }
    next();
  };
}

export function publicUser(user) {
  return {
    id: String(user._id),
    _id: String(user._id),
    nombre: user.nombre,
    apellido: user.apellido,
    correo: user.correo,
    telefono: user.telefono,
    rol: user.rol,
  };
}
