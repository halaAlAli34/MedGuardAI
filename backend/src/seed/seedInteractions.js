/**
 * Seeds (or re-seeds) the InteractionReference collection from the curated
 * JSON dataset. Safe to re-run - it wipes and reloads the collection rather
 * than hardcoding data in application logic, per the spec.
 *
 * Usage: npm run seed
 */
require("dotenv").config();
const mongoose = require("mongoose");
const InteractionReference = require("../models/InteractionReference");
const data = require("./interactions.json");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Seeding InteractionReference collection...");

  await InteractionReference.deleteMany({});
  await InteractionReference.insertMany(data);

  console.log(`Seeded ${data.length} interaction reference pairs.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
