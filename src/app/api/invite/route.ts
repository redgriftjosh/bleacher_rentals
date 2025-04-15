// app/api/invite/route.ts (App Router)
import { NextRequest, NextResponse } from "next/server";
import { createClerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  console.log("process.env.CLERK_SECRET_KEY ", process.env.CLERK_SECRET_KEY);

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const response = await clerkClient.invitations.createInvitation({
      emailAddress: email,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error sending invite:", error);
    console.error("Clerk Error Details:", JSON.stringify(error?.errors, null, 2));
    return NextResponse.json({ error: error.message || "Failed to invite user" }, { status: 500 });
  }
}
