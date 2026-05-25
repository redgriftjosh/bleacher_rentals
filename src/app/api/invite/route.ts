import { NextRequest, NextResponse } from "next/server";
import { createClerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/features/userAccess/logic/requireAdmin";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  console.log("📧 Invite request received for email:", email);

  if (!email || typeof email !== "string") {
    console.error("❌ Invalid email provided:", email);
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    // Try to create invitation
    console.log("🔄 Creating invitation for:", email);
    const response = await clerkClient.invitations.createInvitation({
      emailAddress: email,
    });

    console.log("✅ Invitation created successfully:", response.id);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("❌ Error creating invitation:", error);
    console.error("Error details:", JSON.stringify(error?.errors || error, null, 2));

    const clerkErrors = error?.errors ?? [];
    const firstError = clerkErrors[0];

    // If invitation already exists, revoke it and send a new one
    if (firstError?.code === "duplicate_record") {
      console.log("⚠️ Duplicate record detected, attempting to revoke and resend");
      try {
        // Look up the existing invitation by email
        const existingExpiredInvites = await clerkClient.invitations.getInvitationList({
          query: email,
          status: "expired",
        });

        const existingPendingInvites = await clerkClient.invitations.getInvitationList({
          query: email,
          status: "pending",
        });
        const existingInvites = existingExpiredInvites.data.concat(existingPendingInvites.data);

        const existingInvite = existingInvites.find(
          (invite) => invite.emailAddress.toLowerCase() === email.toLowerCase(),
        );
        console.log("🔍 Found existing invites:", existingInvites.length);

        if (!existingInvite) {
          console.error("❌ Existing invitation not found despite duplicate_record error");
          return NextResponse.json(
            { error: "Existing invitation not found, but duplicate_record error was thrown." },
            { status: 500 },
          );
        }

        // Revoke the old invite
        console.log("🗑️ Revoking old invite:", existingInvite.id);
        await clerkClient.invitations.revokeInvitation(existingInvite.id);

        // Try again to create a new invitation
        console.log("🔄 Creating new invitation after revocation");
        const resentResponse = await clerkClient.invitations.createInvitation({
          emailAddress: email,
        });

        console.log("✅ Invitation resent successfully:", resentResponse.id);
        return NextResponse.json({
          message: "Old invitation revoked. New invitation sent.",
          invitation: resentResponse,
        });
      } catch (resendError: any) {
        console.error("❌ Failed to revoke and resend invite:", resendError);
        return NextResponse.json(
          { error: resendError?.message || "Failed to resend invitation" },
          { status: 500 },
        );
      }
    }

    // All other Clerk errors
    const detailedErrorMessage =
      firstError?.longMessage || firstError?.message || error?.message || "Failed to invite user";

    console.error("❌ Returning error to client:", detailedErrorMessage);
    return NextResponse.json({ error: detailedErrorMessage }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  console.log("🗑️ Delete invite request received for email:", email);

  if (!email || typeof email !== "string") {
    console.error("❌ Invalid email provided:", email);
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    // Search for existing pending or expired invitations
    console.log("🔍 Searching for existing invitations for:", email);
    const pending = await clerkClient.invitations.getInvitationList({
      query: email,
      status: "pending",
    });
    const expired = await clerkClient.invitations.getInvitationList({
      query: email,
      status: "expired",
    });

    const all = [...pending.data, ...expired.data];
    console.log(
      "📋 Found invitations - Pending:",
      pending.data.length,
      "Expired:",
      expired.data.length,
    );

    const invite = all.find((i) => i.emailAddress.toLowerCase() === email.toLowerCase());

    if (!invite) {
      console.warn("⚠️ No active invitation found for:", email);
      return NextResponse.json(
        { error: "No active invitation found for this email." },
        { status: 404 },
      );
    }

    console.log("🗑️ Revoking invitation:", invite.id);
    await clerkClient.invitations.revokeInvitation(invite.id);

    console.log("✅ Invitation revoked successfully for:", email);
    return NextResponse.json({ message: "Invitation revoked successfully." });
  } catch (error: any) {
    console.error("❌ Error revoking invitation:", error);
    console.error("Error details:", JSON.stringify(error?.errors || error, null, 2));

    const message =
      error?.errors?.[0]?.longMessage || error?.message || "Failed to revoke invitation";

    console.error("❌ Returning error to client:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
