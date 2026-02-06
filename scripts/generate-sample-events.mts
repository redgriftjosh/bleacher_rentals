#!/usr/bin/env tsx
/**
 * Generate sample events for development/testing
 * Usage: npm run generate:events -- --count=50
 */

import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import type { Database } from "../database.types.js";

// Load .env.local
try {
  const envPath = join(process.cwd(), ".env.local");
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn("⚠️  Could not load .env.local file");
}

// Account manager UUIDs from seed data
const ACCOUNT_MANAGERS = [
  "90e4c039-7d0b-41f3-b186-9a43fa26ad93",
  "8af93ecd-8ee7-457f-993c-7dd3374bc7d6",
  "35a4c266-1197-46b4-af4d-d4b805f57d9a",
] as const;

// Event statuses
const EVENT_STATUSES = ["quoted", "booked", "lost"] as const;

// Parse command line args
const args = process.argv.slice(2);
const countArg = args.find((arg) => arg.startsWith("--count="));
const COUNT = countArg ? parseInt(countArg.split("=")[1]) : 50;

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Handle local Supabase - use default local JWT secret if needed
if (supabaseUrl?.includes("localhost") || supabaseUrl?.includes("127.0.0.1")) {
  // Local Supabase always uses this default service role key
  supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
  console.log("🔧 Using default local Supabase service role key");
}

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE environment variables");
  console.error("   Make sure NEXT_PUBLIC_SUPABASE_URL is set");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Helper to generate a random date within a range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to format date to YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

async function main() {
  console.log(`🎲 Generating ${COUNT} sample events...`);

  // Fetch existing bleachers and addresses to use as references
  const { data: bleachers } = await supabase.from("Bleachers").select("id").limit(1000);

  if (!bleachers || bleachers.length === 0) {
    console.error("❌ No bleachers found in database. Run seed first.");
    process.exit(1);
  }

  console.log(`✅ Found ${bleachers.length} bleachers`);

  const bleacherIds = bleachers.map((b) => b.id);

  // Generate date range: 6 months in the past to 12 months in the future
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 6);
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 12);

  const eventsToInsert = [];
  const addressesToInsert = [];
  const bleacherEventsToInsert = [];

  for (let i = 0; i < COUNT; i++) {
    // Generate random event dates
    const eventStart = randomDate(pastDate, futureDate);
    const eventEnd = new Date(eventStart);
    eventEnd.setDate(eventEnd.getDate() + faker.number.int({ min: 1, max: 7 })); // 1-7 days long

    // Maybe setup/teardown (70% have setup, 60% have teardown)
    const setupStart = faker.datatype.boolean({ probability: 0.7 })
      ? new Date(eventStart.getTime() - faker.number.int({ min: 1, max: 3 }) * 24 * 60 * 60 * 1000)
      : null;

    const teardownEnd = faker.datatype.boolean({ probability: 0.6 })
      ? new Date(eventEnd.getTime() + faker.number.int({ min: 1, max: 2 }) * 24 * 60 * 60 * 1000)
      : null;

    // Generate address
    const addressId = faker.string.uuid();
    const state = faker.location.state({ abbreviated: true });

    addressesToInsert.push({
      id: addressId,
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state_province: state,
      zip_postal: faker.location.zipCode(),
    });

    // Generate event name (company/organization + event type)
    const eventTypes = [
      "Championship",
      "Festival",
      "Concert",
      "Fair",
      "Rodeo",
      "Tournament",
      "Celebration",
      "Graduation",
      "Ceremony",
      "Game",
    ];
    const eventName = `${faker.company.name()} ${faker.helpers.arrayElement(eventTypes)}`;

    // Random status with weighted distribution: 50% booked, 35% quoted, 15% lost
    const statusRandom = Math.random();
    const status: (typeof EVENT_STATUSES)[number] =
      statusRandom < 0.5 ? "booked" : statusRandom < 0.85 ? "quoted" : "lost";

    // Random seat counts
    const sevenRow = faker.number.int({ min: 0, max: 5 });
    const tenRow = faker.number.int({ min: 0, max: 5 });
    const fifteenRow = faker.number.int({ min: 0, max: 3 });
    const totalSeats = sevenRow * 7 * 21 + tenRow * 10 * 21 + fifteenRow * 15 * 21;

    // Assign random number of bleachers (1-5)
    const bleacherCount = faker.number.int({ min: 1, max: Math.min(5, bleacherIds.length) });
    const assignedBleachers = faker.helpers.arrayElements(bleacherIds, bleacherCount);

    // Calculate revenue: $1,200 per bleacher
    const contractRevenueCents = bleacherCount * 120000;

    // Random hue for color
    const hslHue = faker.number.int({ min: 0, max: 359 });

    // Random account manager
    const createdByUserUuid = faker.helpers.arrayElement(ACCOUNT_MANAGERS);

    // Maybe notes (40% chance)
    const notes = faker.datatype.boolean({ probability: 0.4 })
      ? faker.lorem.sentences(faker.number.int({ min: 1, max: 3 }))
      : null;

    const eventId = faker.string.uuid();

    eventsToInsert.push({
      id: eventId,
      event_name: eventName,
      address_uuid: addressId,
      setup_start: setupStart ? formatDate(setupStart) : null,
      event_start: formatDate(eventStart),
      event_end: formatDate(eventEnd),
      teardown_end: teardownEnd ? formatDate(teardownEnd) : null,
      total_seats: totalSeats,
      seven_row: sevenRow,
      ten_row: tenRow,
      fifteen_row: fifteenRow,
      lenient: faker.datatype.boolean({ probability: 0.3 }),
      booked: status === "booked",
      event_status: status,
      must_be_clean: faker.datatype.boolean({ probability: 0.2 }),
      contract_revenue_cents: contractRevenueCents,
      notes,
      hsl_hue: hslHue,
      goodshuffle_url: faker.datatype.boolean({ probability: 0.3 })
        ? `https://app.goodshuffle.com/event/${faker.string.alphanumeric(10)}`
        : null,
      created_by_user_uuid: createdByUserUuid,
    });

    // Create bleacher event associations
    for (const bleacherId of assignedBleachers) {
      bleacherEventsToInsert.push({
        id: faker.string.uuid(),
        event_uuid: eventId,
        bleacher_uuid: bleacherId,
        setup_confirmed: faker.datatype.boolean({ probability: 0.3 }),
        teardown_confirmed: faker.datatype.boolean({ probability: 0.3 }),
        setup_text: faker.datatype.boolean({ probability: 0.2 })
          ? faker.lorem.sentence()
          : null,
        teardown_text: faker.datatype.boolean({ probability: 0.2 })
          ? faker.lorem.sentence()
          : null,
      });
    }
  }

  // Insert data
  console.log(`📍 Inserting ${addressesToInsert.length} addresses...`);
  const { error: addressError } = await supabase.from("Addresses").insert(addressesToInsert);
  if (addressError) {
    console.error("❌ Failed to insert addresses:", addressError);
    process.exit(1);
  }

  console.log(`🎉 Inserting ${eventsToInsert.length} events...`);
  const { error: eventsError } = await supabase.from("Events").insert(eventsToInsert);
  if (eventsError) {
    console.error("❌ Failed to insert events:", eventsError);
    process.exit(1);
  }

  console.log(`🎪 Inserting ${bleacherEventsToInsert.length} bleacher assignments...`);
  const { error: bleacherEventsError } = await supabase
    .from("BleacherEvents")
    .insert(bleacherEventsToInsert);
  if (bleacherEventsError) {
    console.error("❌ Failed to insert bleacher events:", bleacherEventsError);
    process.exit(1);
  }

  console.log(`\n✅ Successfully generated ${COUNT} sample events!`);
  console.log(`   📍 ${addressesToInsert.length} addresses`);
  console.log(`   🎉 ${eventsToInsert.length} events`);
  console.log(`   🎪 ${bleacherEventsToInsert.length} bleacher assignments`);
  console.log(
    `   💰 Total revenue: $${(eventsToInsert.reduce((sum, e) => sum + (e.contract_revenue_cents || 0), 0) / 100).toLocaleString()}`
  );

  const statusCounts = eventsToInsert.reduce(
    (acc, e) => {
      acc[e.event_status || "unknown"]++;
      return acc;
    },
    { booked: 0, quoted: 0, lost: 0, unknown: 0 }
  );

  console.log(`   📊 Status breakdown:`);
  console.log(`      - Booked: ${statusCounts.booked}`);
  console.log(`      - Quoted: ${statusCounts.quoted}`);
  console.log(`      - Lost: ${statusCounts.lost}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
