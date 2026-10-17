import { exec } from "../db/mysql.js";

export async function create(
  { id, userId, tokenHash, device = null, ip = null, expiresAt },
  conn
) {
  await exec(
    conn,
    `INSERT INTO refresh_tokens (id, user_id, token_hash, device, ip, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, tokenHash, device, ip, expiresAt]
  );
}

export async function findById(id, conn) {
  const rows = await exec(
    conn,
    "SELECT id, user_id, token_hash, expires_at FROM refresh_tokens WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

export async function rotate(id, { tokenHash, expiresAt }, conn) {
  await exec(
    conn,
    "UPDATE refresh_tokens SET token_hash = ?, expires_at = ? WHERE id = ?",
    [tokenHash, expiresAt, id]
  );
}

export async function remove(id, conn) {
  await exec(conn, "DELETE FROM refresh_tokens WHERE id = ?", [id]);
}

export async function removeExpired(conn) {
  await exec(conn, "DELETE FROM refresh_tokens WHERE expires_at < NOW()");
}
