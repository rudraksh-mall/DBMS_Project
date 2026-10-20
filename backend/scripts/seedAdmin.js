/**
 * Create an initial admin account (idempotent).
 * Run: npm run seed-admin
 */
import "dotenv/config";
import bcrypt from "bcrypt";

import * as usersRepo from "../src/repositories/users.repo.js";
import { getPool, closePool } from "../src/db/mysql.js";

getPool();

const EMAIL = process.env.ADMIN_EMAIL || "admin@civicfix.test";
const PASSWORD = process.env.ADMIN_PASSWORD || "Admin@12345";
const NAME = process.env.ADMIN_NAME || "System Admin";

const existing = await usersRepo.findByEmail(EMAIL);
if (existing) {
  console.log("Admin already exists:", EMAIL);
  await closePool();
  process.exit(0);
}

await usersRepo.create({
  name: NAME,
  email: EMAIL,
  password: await bcrypt.hash(PASSWORD, 10),
  role: "admin",
  isVerified: true,
  isActive: true,
  providers: ["local"],
});

console.log("Admin created:");
console.log(`  Email: ${EMAIL}`);
console.log(`  Role: admin`);
await closePool();
process.exit(0);
