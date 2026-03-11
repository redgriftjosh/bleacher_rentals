import {
  getAllQboConnections,
  createQboConnectionPlaceholder,
  deleteQboConnection,
  updateQboConnectionDisplayName,
  updateQboConnectionTaxCode,
} from "@/features/quickbooks-integration/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connections = await getAllQboConnections();
    return NextResponse.json({ connections });
  } catch (error: any) {
    console.error("Failed to fetch QBO connections:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { displayName } = body;

    if (!displayName?.trim()) {
      return NextResponse.json({ error: "displayName is required" }, { status: 400 });
    }

    const connectionId = await createQboConnectionPlaceholder(displayName.trim());
    return NextResponse.json({ connectionId });
  } catch (error: any) {
    console.error("Failed to create QBO connection:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connectionId = req.nextUrl.searchParams.get("connectionId");
    if (!connectionId) {
      return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
    }

    await deleteQboConnection(connectionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete QBO connection:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { connectionId, displayName } = body;

    if (!connectionId) {
      return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
    }

    // Handle tax code update
    if ("taxCodeId" in body) {
      await updateQboConnectionTaxCode(connectionId, body.taxCodeId ?? null);
      return NextResponse.json({ success: true });
    }

    if (!displayName?.trim()) {
      return NextResponse.json({ error: "displayName is required" }, { status: 400 });
    }

    await updateQboConnectionDisplayName(connectionId, displayName.trim());
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update QBO connection:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
