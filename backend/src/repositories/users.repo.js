import { exec } from "../db/mysql.js";

const COLUMNS =
  "id, name, email, password, role, ward_id, phone, avatar, otp_code, otp_expires_at, is_verified, is_active, google_id, providers, created_at, updated_at";

export async function findByEmail(email, conn) {
  const rows = await exec(
    conn,
    `SELECT ${COLUMNS} FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findById(id, conn) {
  const rows = await exec(
    conn,
    `SELECT ${COLUMNS} FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function create(data, conn) {
  const {
    name,
    email,
    password,
    role = "citizen",
    wardId = null,
    phone = null,
    avatar = null,
    isVerified = false,
    isActive = true,
    googleId = null,
    providers = ["local"],
    otpCode = null,
    otpExpiresAt = null,
  } = data;

  const result = await exec(
    conn,
    `INSERT INTO users
       (name, email, password, role, ward_id, phone, avatar, is_verified,
        is_active, google_id, providers, otp_code, otp_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      email,
      password,
      role,
      wardId,
      phone,
      avatar,
      isVerified ? 1 : 0,
      isActive ? 1 : 0,
      googleId,
      JSON.stringify(providers),
      otpCode,
      otpExpiresAt,
    ]
  );

  return result.insertId;
}

export async function updateOtp(id, code, expiresAt, conn) {
  await exec(
    conn,
    "UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?",
    [code, expiresAt, id]
  );
}

export async function markVerified(id, conn) {
  await exec(
    conn,
    "UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?",
    [id]
  );
}

export async function linkGoogle(id, { googleId, avatar, providers }, conn) {
  await exec(
    conn,
    "UPDATE users SET google_id = ?, avatar = COALESCE(?, avatar), is_verified = 1, providers = ? WHERE id = ?",
    [googleId, avatar ?? null, JSON.stringify(providers), id]
  );
}

export async function setActive(id, isActive, conn) {
  await exec(conn, "UPDATE users SET is_active = ? WHERE id = ?", [
    isActive ? 1 : 0,
    id,
  ]);
}

export async function updateAuthority(id, { name, wardId, isActive }, conn) {
  const sets = [];
  const params = [];
  if (name !== undefined) {
    sets.push("name = ?");
    params.push(name);
  }
  if (wardId !== undefined) {
    sets.push("ward_id = ?");
    params.push(wardId);
  }
  if (isActive !== undefined) {
    sets.push("is_active = ?");
    params.push(isActive ? 1 : 0);
  }
  if (sets.length === 0) return;
  params.push(id);
  await exec(conn, `UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
}

/**
 * Authorities with their (optional) ward, matching the previous
 * `.populate("wardId", "name city")` output.
 */
export async function listAuthoritiesWithWard(conn) {
  return exec(
    conn,
    `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
            w.id AS ward_join_id, w.name AS ward_join_name, w.city AS ward_join_city
       FROM users u
       LEFT JOIN wards w ON w.id = u.ward_id
      WHERE u.role = 'authority'
      ORDER BY u.created_at DESC`
  );
}
