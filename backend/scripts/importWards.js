import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

import * as wardsRepo from "../src/repositories/wards.repo.js";
import { getPool, closePool } from "../src/db/mysql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

getPool();

const CITIES = {
  prayagraj: { file: "prayagraj.geojson", name: "Prayagraj" },
  gorakhpur: { file: "gorakhpur.geojson", name: "Gorakhpur" },
};

const cityArg = process.argv.find((a) => a.startsWith("--city="));
const selected = cityArg
  ? [cityArg.split("=")[1].toLowerCase()]
  : Object.keys(CITIES);

async function importCity(city) {
  const config = CITIES[city];
  if (!config) return console.log(`Unknown city: ${city}`);

  const filePath = path.resolve(__dirname, "../data", config.file);
  if (!fs.existsSync(filePath)) return console.log(`File not found: ${filePath}`);

  const geojson = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  let inserted = 0;
  let skipped = 0;

  for (const feature of geojson.features) {
    const wardName = `Ward ${feature.properties.ward_no} – ${feature.properties.ward_name}`;
    const exists = await wardsRepo.existsByCityAndName(config.name, wardName);

    if (exists) {
      skipped++;
      continue;
    }

    await wardsRepo.insert({
      name: wardName,
      city: config.name,
      boundaryGeoJson: JSON.stringify(feature.geometry),
    });
    inserted++;
  }

  console.log(`${config.name}: Inserted ${inserted}, Skipped ${skipped}`);
  return inserted;
}

async function importAll() {
  let total = 0;
  for (const city of selected) {
    total += (await importCity(city)) || 0;
  }
  console.log(`Total new wards imported: ${total}`);
  await closePool();
}

importAll().catch(async (err) => {
  console.error("Import failed:", err.message);
  await closePool();
  process.exit(1);
});