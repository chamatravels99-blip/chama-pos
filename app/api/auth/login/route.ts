import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate inputs
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Connect to database
    await connectToDatabase();

    // Query user and explicitly select passwordHash
    const user = await User.findOne({ email: cleanEmail }).select("+passwordHash");

    if (!user || user.status === "inactive") {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Lookup business details for tenant users
    let businessName: string | undefined;
    let businessSlug: string | undefined;

    if (user.businessId) {
      const business = await Business.findById(user.businessId);

      if (!business || business.status !== "active") {
        return NextResponse.json(
          { error: "Your business account is suspended or inactive. Please contact support." },
          { status: 403 }
        );
      }

      businessName = business.name;
      businessSlug = business.slug;
    }

    // Update last login timestamp in background
    user.lastLoginAt = new Date();
    await user.save();

    // Construct session payload
    const sessionPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId ? user.businessId.toString() : null,
      businessName,
      businessSlug,
      branchIds: user.branchIds || [],
      activeBranchId: user.branchIds?.[0],
    };

    // Set secure HTTP-only cookie
    await createSession(sessionPayload);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: user.businessId,
          businessName,
          businessSlug,
          branchIds: user.branchIds || [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Log internal error safely on server only (no secrets/passwords)
    console.error("Authentication error occurred in /api/auth/login:", error instanceof Error ? error.message : "Unknown error");

    // Return safe generic error response
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication. Please try again." },
      { status: 500 }
    );
  }
}
