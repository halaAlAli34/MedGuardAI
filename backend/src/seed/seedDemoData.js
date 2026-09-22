/**
 * Optional: seeds realistic demo data (a patient, a caregiver linked to them,
 * and a set of medications that trigger one mild, one moderate, and two
 * severe interaction flags) so you can explore the app immediately without
 * manual data entry, and so the AI explainer can be exercised across every
 * severity level out of the box.
 *
 * Usage: npm run seed:demo   (run `npm run seed` first)
 *
 * Demo login credentials (printed at the end of this script):
 *   Patient:   patient@demo.com / Password123!
 *   Caregiver: caregiver@demo.com / Password123!
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const CaregiverLink = require("../models/CaregiverLink");
const Medication = require("../models/Medication");
const { checkInteractionsForNewMedication } = require("../services/interactionEngine");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Seeding demo data...");

  await Promise.all([
    User.deleteMany({ email: { $in: ["patient@demo.com", "caregiver@demo.com"] } })
  ]);

  const password_hash = await bcrypt.hash("Password123!", 12);

  const patient = await User.create({
    name: "Jordan Lee",
    email: "patient@demo.com",
    password_hash,
    role: "patient",
    age: 68,
    conditions: ["atrial fibrillation", "type 2 diabetes"]
  });

  const caregiver = await User.create({
    name: "Riley Lee",
    email: "caregiver@demo.com",
    password_hash,
    role: "caregiver"
  });

  await CaregiverLink.create({
    caregiver_id: caregiver._id,
    patient_id: patient._id,
    permission_level: "edit",
    status: "active",
    invite_code: "DEMO1234"
  });

  const meds = [
    // Severe: Warfarin + Aspirin (bleeding risk)
    { name: "Warfarin", dosage: "5mg", frequency: "Once daily", prescribing_doctor: "Dr. Patel" },
    { name: "Aspirin", dosage: "81mg", frequency: "Once daily", prescribing_doctor: "Dr. Nguyen" },
    // Severe: Simvastatin + Clarithromycin (muscle toxicity)
    { name: "Simvastatin", dosage: "20mg", frequency: "Once daily at bedtime", prescribing_doctor: "Dr. Patel" },
    { name: "Clarithromycin", dosage: "500mg", frequency: "Twice daily", prescribing_doctor: "Dr. Nguyen" },
    // Moderate: Lisinopril + Potassium Chloride (hyperkalemia risk)
    { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", prescribing_doctor: "Dr. Patel" },
    { name: "Potassium Chloride", dosage: "20mEq", frequency: "Once daily", prescribing_doctor: "Dr. Osei" },
    // Mild: Levothyroxine + Calcium Carbonate (absorption interference)
    { name: "Levothyroxine", dosage: "75mcg", frequency: "Once daily, morning", prescribing_doctor: "Dr. Osei" },
    { name: "Calcium Carbonate", dosage: "500mg", frequency: "Twice daily", prescribing_doctor: "Dr. Osei" },
    // No known interaction, for contrast
    { name: "Metformin", dosage: "500mg", frequency: "Twice daily", prescribing_doctor: "Dr. Patel" }
  ];

  for (const m of meds) {
    const med = await Medication.create({
      patient_id: patient._id,
      added_by: patient._id,
      ...m,
      start_date: new Date(),
      status: "active"
    });
    await checkInteractionsForNewMedication(med);
  }

  console.log("Demo data seeded.\n");
  console.log("  Patient login:   patient@demo.com / Password123!");
  console.log("  Caregiver login: caregiver@demo.com / Password123! (already linked to Jordan Lee)\n");
  console.log("  Flagged interactions created: Warfarin+Aspirin (severe), Simvastatin+Clarithromycin (severe),");
  console.log("  Lisinopril+Potassium Chloride (moderate), Levothyroxine+Calcium Carbonate (mild).\n");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
