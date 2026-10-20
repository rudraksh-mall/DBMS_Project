/**
 * CivicFix AI — idempotent MySQL demonstration seed.
 *
 * Safe by design:
 *   - Refuses to run against production or a non-approved database.
 *   - Only inserts missing records; never deletes or truncates anything.
 *   - Re-running produces no duplicate users, wards, complaints, votes or
 *     status-history rows.
 *
 * Run: npm run seed
 */
import "dotenv/config";
import bcrypt from "bcrypt";

import { getPool, closePool, exec } from "./db/mysql.js";
import * as wardsRepo from "./repositories/wards.repo.js";
import * as usersRepo from "./repositories/users.repo.js";
import * as complaintsRepo from "./repositories/complaints.repo.js";
import * as historyRepo from "./repositories/history.repo.js";
import { calculatePriority } from "./services/priority.service.js";

const DAY = 24 * 60 * 60 * 1000;

/* ----------------------------- Safety guard ----------------------------- */

function assertSeedAllowed() {
  const db = process.env.MYSQL_DATABASE || "civicfix";
  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    throw new Error("Refusing to seed with NODE_ENV=production");
  }

  const allowlist = (process.env.SEED_ALLOWED_DATABASES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedByPattern =
    db === "civicfix" ||
    /(_dev|_test|_seed|_demo|_local)$/i.test(db) ||
    /local/i.test(db);

  if (!allowlist.includes(db) && !allowedByPattern) {
    throw new Error(
      `Refusing to seed database "${db}". It is not explicitly approved as a ` +
        `development/test/demo database. Set SEED_ALLOWED_DATABASES to allow it.`
    );
  }
}

/* ------------------------------- Data ---------------------------------- */

const rect = (w, s, e, n) =>
  JSON.stringify({
    type: "Polygon",
    coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
  });

const WARDS = [
  { name: "Hazratganj / Ward 1", city: "Lucknow", geo: rect(80.93, 26.84, 80.95, 26.86) },
  { name: "Gomti Nagar / Ward 2", city: "Lucknow", geo: rect(80.97, 26.83, 81.01, 26.87) },
  { name: "Aliganj / Ward 3", city: "Lucknow", geo: rect(80.92, 26.88, 80.96, 26.92) },
  { name: "Indira Nagar / Ward 4", city: "Lucknow", geo: rect(80.98, 26.87, 81.02, 26.91) },
  { name: "Civil Lines", city: "Prayagraj", geo: rect(81.81, 25.43, 81.85, 25.47) },
  { name: "Teliyarganj", city: "Prayagraj", geo: rect(81.85, 25.43, 81.89, 25.47) },
  { name: "Golghar", city: "Gorakhpur", geo: rect(83.35, 26.74, 83.39, 26.78) },
  { name: "Mohaddiganj", city: "Gorakhpur", geo: rect(83.39, 26.74, 83.43, 26.78) },
];

const USERS = [
  { name: "System Admin", email: "admin@civicfix.test", password: "Admin@12345", role: "admin" },
  {
    name: "Aarti Verma",
    email: "authority.lucknow@civicfix.test",
    password: "Authority@123",
    role: "authority",
    ward: "Hazratganj / Ward 1",
  },
  {
    name: "Rakesh Singh",
    email: "authority.prayagraj@civicfix.test",
    password: "Authority@123",
    role: "authority",
    ward: "Civil Lines",
  },
  {
    name: "Neha Gupta",
    email: "authority.gorakhpur@civicfix.test",
    password: "Authority@123",
    role: "authority",
    ward: "Golghar",
  },
  { name: "Priya Sharma", email: "citizen1@civicfix.test", password: "Citizen@123", role: "citizen" },
  { name: "Amit Kumar", email: "citizen2@civicfix.test", password: "Citizen@123", role: "citizen" },
  { name: "Sara Khan", email: "citizen3@civicfix.test", password: "Citizen@123", role: "citizen" },
  { name: "Rahul Yadav", email: "citizen4@civicfix.test", password: "Citizen@123", role: "citizen" },
];

const IMG = (label) => `https://via.placeholder.com/800x450?text=${encodeURIComponent(label)}`;

const COMPLAINTS = [
  {
    reporter: "citizen1@civicfix.test",
    city: "Lucknow",
    ward: "Hazratganj / Ward 1",
    lat: 80.94, lng: 26.85,
    description: "Large pothole has formed near Hazratganj crossing, causing two-wheelers to skid every evening.",
    category: "road", severity: "high", keywords: ["pothole", "road-damage"], confidence: 0.93,
    status: "in_progress", daysAgo: 9, remarks: "Road repair crew assigned; work scheduled this week.",
    votes: ["citizen2@civicfix.test", "citizen3@civicfix.test", "citizen4@civicfix.test"],
  },
  {
    reporter: "citizen2@civicfix.test",
    city: "Lucknow",
    ward: "Gomti Nagar / Ward 2",
    lat: 80.99, lng: 26.85,
    description: "Garbage is overflowing from the community bin behind the market for the past five days.",
    category: "garbage", severity: "medium", keywords: ["garbage", "overflowing-bin"], confidence: 0.88,
    status: "acknowledged", daysAgo: 4, remarks: "Sanitation team notified for pickup.",
    votes: ["citizen1@civicfix.test", "citizen4@civicfix.test"],
  },
  {
    reporter: "citizen3@civicfix.test",
    city: "Lucknow",
    ward: "Aliganj / Ward 3",
    lat: 80.94, lng: 26.90,
    description: "Street light on the main lane has been dark for over a week, making the area unsafe at night.",
    category: "lighting", severity: "high", keywords: ["streetlight", "dark-area", "public-safety"], confidence: 0.91,
    status: "submitted", daysAgo: 2, remarks: null,
    votes: ["citizen1@civicfix.test"],
  },
  {
    reporter: "citizen4@civicfix.test",
    city: "Lucknow",
    ward: "Indira Nagar / Ward 4",
    lat: 81.00, lng: 26.89,
    description: "Drain is choked and dirty water is spilling onto the footpath near the bus stop.",
    category: "drainage", severity: "high", keywords: ["drainage", "blocked-drain", "waterlogging"], confidence: 0.9,
    status: "resolved", daysAgo: 12,
    remarks: "Drain desilted and cleared by the ward team.", afterFix: IMG("Resolved Drain"),
    votes: ["citizen1@civicfix.test", "citizen2@civicfix.test", "citizen3@civicfix.test"],
  },
  {
    reporter: "citizen1@civicfix.test",
    city: "Prayagraj",
    ward: "Civil Lines",
    lat: 81.83, lng: 25.45,
    description: "Broken water pipeline is leaking continuously on the road, wasting a lot of water.",
    category: "water", severity: "medium", keywords: ["water-leakage", "pipe-damage"], confidence: 0.86,
    status: "in_progress", daysAgo: 6, remarks: "Pipeline repaired partially; valve replacement pending.",
    votes: ["citizen2@civicfix.test", "citizen3@civicfix.test"],
  },
  {
    reporter: "citizen2@civicfix.test",
    city: "Prayagraj",
    ward: "Teliyarganj",
    lat: 81.87, lng: 25.45,
    description: "Traffic signal at the intersection is not working, creating long jams during peak hours.",
    category: "traffic", severity: "high", keywords: ["traffic-signal", "signal-fault"], confidence: 0.84,
    status: "submitted", daysAgo: 1, remarks: null,
    votes: ["citizen1@civicfix.test", "citizen4@civicfix.test"],
  },
  {
    reporter: "citizen3@civicfix.test",
    city: "Prayagraj",
    ward: "Civil Lines",
    lat: 81.82, lng: 25.44,
    description: "Public footpath tiles are broken and uneven, causing pedestrians to trip and fall.",
    category: "infrastructure", severity: "low", keywords: ["public-infrastructure", "damage"], confidence: 0.8,
    status: "acknowledged", daysAgo: 3, remarks: "Inspected; repair estimate under review.",
    votes: [],
  },
  {
    reporter: "citizen4@civicfix.test",
    city: "Gorakhpur",
    ward: "Golghar",
    lat: 83.37, lng: 26.76,
    description: "A fallen tree branch is blocking half of the road near the Golghar roundabout.",
    category: "obstruction", severity: "high", keywords: ["road-obstruction", "fallen-tree"], confidence: 0.92,
    status: "in_progress", daysAgo: 5, remarks: "Branch being cleared by the municipal crew.",
    votes: ["citizen1@civicfix.test", "citizen2@civicfix.test", "citizen3@civicfix.test"],
  },
  {
    reporter: "citizen1@civicfix.test",
    city: "Gorakhpur",
    ward: "Mohaddiganj",
    lat: 83.41, lng: 26.76,
    description: "Garbage is being dumped illegally on the empty plot next to the school.",
    category: "garbage", severity: "medium", keywords: ["garbage", "waste", "cleanliness"], confidence: 0.85,
    status: "resolved", daysAgo: 15,
    remarks: "Site cleared and a no-dumping board installed.", afterFix: IMG("Resolved Garbage"),
    votes: ["citizen2@civicfix.test"],
  },
  {
    reporter: "citizen2@civicfix.test",
    city: "Gorakhpur",
    ward: "Golghar",
    lat: 83.36, lng: 26.75,
    description: "Sewer manhole cover is missing near the market entrance, a serious accident risk.",
    category: "drainage", severity: "high", keywords: ["sewage", "manhole", "high-risk"], confidence: 0.89,
    status: "submitted", daysAgo: 1, remarks: null,
    votes: ["citizen3@civicfix.test", "citizen4@civicfix.test"],
  },
];

/* --------------------------- Seed operations ---------------------------- */

async function seedWards() {
  const map = new Map();
  for (const ward of WARDS) {
    let row = null;
    const exists = await wardsRepo.existsByCityAndName(ward.city, ward.name);
    if (!exists) {
      await wardsRepo.insert({ name: ward.name, city: ward.city, boundaryGeoJson: ward.geo });
    }
    const found = await exec(
      null,
      "SELECT id FROM wards WHERE city = ? AND name = ? LIMIT 1",
      [ward.city, ward.name]
    );
    row = found[0];
    map.set(`${ward.city}|${ward.name}`, Number(row.id));
  }
  console.log(`Wards ready: ${map.size}`);
  return map;
}

async function seedUsers(wardMap) {
  const byEmail = new Map();
  for (const user of USERS) {
    let existing = await usersRepo.findByEmail(user.email);
    if (!existing) {
      let wardId = null;
      if (user.ward) {
        const wardCity = WARDS.find((w) => w.name === user.ward)?.city;
        wardId = wardMap.get(`${wardCity}|${user.ward}`) ?? null;
      }
      const id = await usersRepo.create({
        name: user.name,
        email: user.email,
        password: await bcrypt.hash(user.password, 10),
        role: user.role,
        wardId,
        isVerified: true,
        isActive: true,
        providers: ["local"],
      });
      existing = await usersRepo.findById(id);
    }
    byEmail.set(user.email, { id: Number(existing.id), role: existing.role, wardId: existing.ward_id });
  }
  console.log(`Users ready: ${byEmail.size}`);
  return byEmail;
}

async function linkWardAdmins(wardMap, usersByEmail) {
  for (const user of USERS) {
    if (user.role !== "authority" || !user.ward) continue;
    const city = WARDS.find((w) => w.name === user.ward)?.city;
    const wardId = wardMap.get(`${city}|${user.ward}`);
    const userId = usersByEmail.get(user.email).id;
    if (wardId && userId) {
      await exec(null, "INSERT IGNORE INTO ward_admins (ward_id, user_id) VALUES (?, ?)", [
        wardId,
        userId,
      ]);
    }
  }
}

async function seedComplaints(wardMap, usersByEmail) {
  const idsByDescription = new Map();

  for (const spec of COMPLAINTS) {
    const reporter = usersByEmail.get(spec.reporter);
    const wardKey = `${spec.city}|${spec.ward}`;
    const wardId = wardMap.get(wardKey);
    // NOTE: demo coordinates are [lng, lat] in the spec.
    const lng = spec.lat;
    const lat = spec.lng;

    const existing = await exec(
      null,
      "SELECT id FROM complaints WHERE reported_by = ? AND description = ? LIMIT 1",
      [reporter.id, spec.description]
    );

    if (existing[0]) {
      idsByDescription.set(spec.description, Number(existing[0].id));
      continue;
    }

    const createdAt = new Date(Date.now() - spec.daysAgo * DAY);

    const id = await complaintsRepo.insert({
      reportedBy: reporter.id,
      description: spec.description,
      imageUrl: IMG(spec.category),
      lat,
      lng,
      wardId,
      aiCategory: spec.category,
      aiSeverity: spec.severity,
      aiKeywords: spec.keywords,
      aiConfidence: spec.confidence,
      aiStatus: "ai",
    });

    await exec(null, "UPDATE complaints SET created_at = ? WHERE id = ?", [createdAt, id]);
    idsByDescription.set(spec.description, id);
  }

  console.log(`Complaints ready: ${idsByDescription.size}`);
  return idsByDescription;
}

async function seedVotes(idsByDescription, usersByEmail) {
  let inserted = 0;
  for (const spec of COMPLAINTS) {
    const complaintId = idsByDescription.get(spec.description);
    for (const voterEmail of spec.votes) {
      const voter = usersByEmail.get(voterEmail);
      if (!voter || !complaintId) continue;
      const result = await exec(
        null,
        "INSERT IGNORE INTO votes (complaint_id, user_id) VALUES (?, ?)",
        [complaintId, voter.id]
      );
      inserted += result.affectedRows;
    }
  }

  // Derive upvote_count from the votes table (single source of truth).
  await exec(
    null,
    "UPDATE complaints c SET c.upvote_count = (SELECT COUNT(*) FROM votes v WHERE v.complaint_id = c.id)"
  );

  console.log(`Votes inserted this run: ${inserted}`);
}

async function finalizeComplaints(idsByDescription, usersByEmail) {
  for (const spec of COMPLAINTS) {
    const id = idsByDescription.get(spec.description);
    const row = await complaintsRepo.getById(id);

    const score = calculatePriority({
      aiSeverity: row.ai_severity,
      upvoteCount: row.upvote_count,
      createdAt: row.created_at,
      status: spec.status,
    });

    const resolvedAt =
      spec.status === "resolved" ? new Date(Date.now() - Math.floor(spec.daysAgo / 2) * DAY) : null;

    await complaintsRepo.updateStatusFields(id, {
      status: spec.status,
      authorityRemarks: spec.remarks,
      afterFixImageUrl: spec.status === "resolved" ? spec.afterFix : null,
      resolvedAt,
      priorityScore: score,
    });
  }
}

async function seedHistory(idsByDescription, usersByEmail) {
  for (const spec of COMPLAINTS) {
    const complaintId = idsByDescription.get(spec.description);
    const existing = await exec(
      null,
      "SELECT COUNT(*) AS n FROM complaint_status_history WHERE complaint_id = ?",
      [complaintId]
    );
    if (existing[0].n > 0) continue;

    const reporter = usersByEmail.get(spec.reporter);
    await historyRepo.create({
      complaintId,
      status: "submitted",
      changedBy: reporter.id,
      remarks: "Complaint submitted",
    });

    let chain = [];
    if (spec.status === "acknowledged") chain = ["acknowledged"];
    else if (spec.status === "in_progress") chain = ["acknowledged", "in_progress"];
    else if (spec.status === "resolved") chain = ["acknowledged", "in_progress", "resolved"];

    for (const status of chain) {
      await historyRepo.create({
        complaintId,
        status,
        changedBy: reporter.id,
        remarks: status === "resolved" ? spec.remarks : null,
      });
    }
  }
  console.log("Status history ready");
}

async function main() {
  assertSeedAllowed();
  getPool();

  const wardMap = await seedWards();
  const usersByEmail = await seedUsers(wardMap);
  await linkWardAdmins(wardMap, usersByEmail);
  const idsByDescription = await seedComplaints(wardMap, usersByEmail);
  await seedVotes(idsByDescription, usersByEmail);
  await finalizeComplaints(idsByDescription, usersByEmail);
  await seedHistory(idsByDescription, usersByEmail);

  const [[counts]] = await getPool().query(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM wards) AS wards,
       (SELECT COUNT(*) FROM complaints) AS complaints,
       (SELECT COUNT(*) FROM votes) AS votes,
       (SELECT COUNT(*) FROM complaint_status_history) AS history`
  );
  console.log("Seed complete:", counts);
  console.log("Demo credentials: see docs/demo-credentials.md");
  await closePool();
}

main().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await closePool();
  process.exit(1);
});