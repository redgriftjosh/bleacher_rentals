import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  console.log("Triggered");
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error("Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env");
  }

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing Svix headers", {
      status: 400,
    });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error: Could not verify webhook:", err);
    return new Response("Error: Verification error", {
      status: 400,
    });
  }

  // Do something with payload
  // For this guide, log payload to console
  const { id } = evt.data;
  const eventType = evt.type;
  console.log(`Received webhook with ID ${id} and event type of ${eventType}`);
  console.log("Webhook payload:", body);

  const supabase = await createServiceRoleClient(); // no permission issues.
  if (evt.type === "user.created") {
    try {
      await supabase.from("Users").insert({
        clerk_user_id: evt.data.id,
        first_name: evt.data.first_name || null,
        last_name: evt.data.last_name || null,
        email: evt.data.email_addresses?.[0]?.email_address || null,
        phone: evt.data.phone_numbers?.[0]?.phone_number || null,
      });
    } catch (error) {
      console.log(error);
    }
  } else if (evt.type === "user.updated") {
    try {
      await supabase
        .from("Users")
        .update({
          clerk_user_id: evt.data.id,
          first_name: evt.data.first_name || null,
          last_name: evt.data.last_name || null,
          email: evt.data.email_addresses?.[0]?.email_address || null,
          phone: evt.data.phone_numbers?.[0]?.phone_number || null,
        })
        .eq("clerk_user_id", evt.data.id);
    } catch (error) {
      console.log(error);
    }
  } else if (evt.type === "user.deleted") {
    try {
      await supabase.from("Users").delete().eq("clerk_user_id", evt.data.id);
    } catch (error) {
      console.log(error);
    }
  }

  return new Response("Webhook received", { status: 200 });
}
