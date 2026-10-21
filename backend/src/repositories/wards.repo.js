import { exec } from "../db/mysql.js";

const WARD_COLUMNS = "id, name, city";

export async function insert({ name, city, boundaryGeoJson }, conn) {
  const result = await exec(
    conn,
    `INSERT INTO wards (name, city, boundary)
     VALUES (?, ?, ST_GeomFromGeoJSON(?))`,
    [name, city, boundaryGeoJson]
  );
  return result.insertId;
}

export async function existsByCityAndName(city, name, conn) {
  const rows = await exec(
    conn,
    "SELECT id FROM wards WHERE city = ? AND name = ? LIMIT 1",
    [city, name]
  );
  return !!rows[0];
}

export async function findById(id, conn) {
  const rows = await exec(
    conn,
    `SELECT ${WARD_COLUMNS} FROM wards WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findByPoint(lat, lng, conn) {
  const rows = await exec(
    conn,
    `SELECT ${WARD_COLUMNS}
       FROM wards
      WHERE ST_Intersects(boundary, ST_SRID(POINT(?, ?), 4326))
      LIMIT 1`,
    [lng, lat]
  );
  return rows[0] || null;
}

export async function listByCity(city, conn) {
  if (city === null || city === undefined || city === "") {
    return exec(
      conn,
      `SELECT ${WARD_COLUMNS} FROM wards ORDER BY city ASC, name ASC`
    );
  }
  return exec(
    conn,
    `SELECT ${WARD_COLUMNS} FROM wards WHERE city = ? ORDER BY name ASC`,
    [city]
  );
}

export async function listCities(conn) {
  const rows = await exec(
    conn,
    "SELECT DISTINCT city FROM wards ORDER BY city ASC"
  );
  return rows.map((row) => row.city);
}
