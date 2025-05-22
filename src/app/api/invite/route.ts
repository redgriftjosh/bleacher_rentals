import { NextRequest, NextResponse } from "next/server";
import { createClerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    // Try to create invitation
    const response = await clerkClient.invitations.createInvitation({
      emailAddress: email,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    const clerkErrors = error?.errors ?? [];
    const firstError = clerkErrors[0];

    // If invitation already exists, revoke it and send a new one
    if (firstError?.code === "duplicate_record") {
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
          (invite) => invite.emailAddress.toLowerCase() === email.toLowerCase()
        );
        console.log("existingInvites:", existingInvites);

        if (!existingInvite) {
          return NextResponse.json(
            { error: "Existing invitation not found, but duplicate_record error was thrown." },
            { status: 500 }
          );
        }

        // Revoke the old invite
        await clerkClient.invitations.revokeInvitation(existingInvite.id);

        // Try again to create a new invitation
        const resentResponse = await clerkClient.invitations.createInvitation({
          emailAddress: email,
        });

        return NextResponse.json({
          message: "Old invitation revoked. New invitation sent.",
          invitation: resentResponse,
        });
      } catch (resendError: any) {
        console.error("❌ Failed to revoke and resend invite:", resendError);
        return NextResponse.json(
          { error: resendError?.message || "Failed to resend invitation" },
          { status: 500 }
        );
      }
    }

    // All other Clerk errors
    const detailedErrorMessage =
      firstError?.longMessage || firstError?.message || error?.message || "Failed to invite user";

    return NextResponse.json({ error: detailedErrorMessage }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { email } = await req.json();
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    // Search for existing pending or expired invitations
    const pending = await clerkClient.invitations.getInvitationList({
      query: email,
      status: "pending",
    });
    const expired = await clerkClient.invitations.getInvitationList({
      query: email,
      status: "expired",
    });

    const all = [...pending.data, ...expired.data];
    const invite = all.find((i) => i.emailAddress.toLowerCase() === email.toLowerCase());

    if (!invite) {
      return NextResponse.json(
        { error: "No active invitation found for this email." },
        { status: 404 }
      );
    }

    await clerkClient.invitations.revokeInvitation(invite.id);

    return NextResponse.json({ message: "Invitation revoked successfully." });
  } catch (error: any) {
    console.error("❌ Error revoking invitation:", error);
    const message =
      error?.errors?.[0]?.longMessage || error?.message || "Failed to revoke invitation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
