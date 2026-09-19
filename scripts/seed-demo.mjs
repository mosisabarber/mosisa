/**
 * Demo data seed (Stage 5 live verification).
 *
 * Clearly-labelled placeholder content so /book and the public pages can be
 * smoke-tested before the Stage 8 admin dashboard exists. Idempotent:
 * re-running never duplicates rows or clobbers user edits.
 *
 *   node scripts/seed-demo.mjs
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BARBERS = [
  {
    slug: "mosisa",
    name: "Mosisa",
    bio: "Owner and master barber. Fifteen years behind the chair — classic cuts, straight-razor finishes, and a reputation clients cross the city for.",
    specialties: ["Classic cuts", "Straight razor", "Fades"],
    bufferMinutes: 10,
  },
  {
    slug: "dawit",
    name: "Dawit",
    bio: "Precision fades and modern styling. Fast, clean, and consistent — every visit ends with a sharp look.",
    specialties: ["Skin fades", "Modern styles", "Beard shaping"],
    bufferMinutes: 5,
  },
  {
    slug: "sami",
    name: "Sami",
    bio: "Beard specialist and hot-towel shaves. Patient, detail-obsessed, and never rushed.",
    specialties: ["Beard trim", "Hot towel shave", "Line-ups"],
    bufferMinutes: 5,
  },
];

const SERVICES = [
  { name: "Classic Cut", description: "Traditional haircut, finished with a neck shave and style.", duration: 30, price: "300.00" },
  { name: "Skin Fade", description: "Zero-to-blend fade, sharp lines, styled to finish.", duration: 45, price: "400.00" },
  { name: "Beard Trim", description: "Shape, define and condition — hot towel included.", duration: 20, price: "200.00" },
  { name: "Cut + Beard Combo", description: "Full cut and beard grooming in one sitting.", duration: 60, price: "450.00" },
];

async function run() {
  for (const b of BARBERS) {
    await pool.query(
      `INSERT INTO barbers (name, slug, bio, specialties, buffer_minutes, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (slug) DO NOTHING`,
      [b.name, b.slug, b.bio, b.specialties, b.bufferMinutes]
    );
  }

  for (const s of SERVICES) {
    const existing = await pool.query(
      `SELECT id FROM services WHERE name = $1 LIMIT 1`,
      [s.name]
    );
    if (existing.rowCount === 0) {
      await pool.query(
        `INSERT INTO services (name, description, duration_minutes, price, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [s.name, s.description, s.duration, s.price]
      );
    }
  }

  // Shop-wide hours: fixed every day (product spec §4) 09:00–20:00.
  const hoursCount = await pool.query(`SELECT count(*)::int AS n FROM working_hours`);
  if (hoursCount.rows[0].n === 0) {
    for (let day = 0; day <= 6; day++) {
      await pool.query(
        `INSERT INTO working_hours (day_of_week, start_time, end_time)
         VALUES ($1, '09:00', '20:00')`,
        [day]
      );
    }
  }

  const summary = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM barbers) AS barbers,
       (SELECT count(*)::int FROM services) AS services,
       (SELECT count(*)::int FROM working_hours) AS hours`
  );
  console.log("Seed complete:", summary.rows[0]);
  await pool.end();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
