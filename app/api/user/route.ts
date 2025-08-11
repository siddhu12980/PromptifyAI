/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { User, Plan } from "@/lib/models";
import { ApiResponse } from "@/lib/types";
import { EXTENSION_ORIGIN } from "@/lib/const";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": EXTENSION_ORIGIN, // exact match required
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// GET /api/user - Get user profile
export async function GET(request: NextRequest) {
  console.log("GET /api/user", request.cookies.size || "no cookies");
  try {
    // Get authenticated user from Clerk
    const clerkUser = await currentUser();

    console.log(
      "clerkUser",
      clerkUser?.id,
      clerkUser?.emailAddresses?.[0]?.emailAddress
    );

    if (!clerkUser) {
      console.log("No authenticated user found");
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Unauthorized - Please sign in to access your profile",
        },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Connect to database
    await dbConnect();
    console.log("Database connected successfully");

    // Find user in our database
    let user = await User.findOne({ clerkId: clerkUser.id }).populate("planId");
    console.log("user exists", user ? "YES" : "NO", "clerkId:", clerkUser.id);

    // If user doesn't exist, create them with free plan
    if (!user) {
      console.log("Creating new user...");
      const freePlan = await Plan.findOne({ name: "free", isActive: true });
      console.log("Free plan found:", freePlan ? "YES" : "NO");

      if (!freePlan) {
        console.error("Free plan not found in database");
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "Free plan not found. Please contact support.",
          },
          { status: 500, headers: corsHeaders() }
        );
      }

      user = new User({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        planId: freePlan._id,
      });

      console.log("Saving new user:", {
        clerkId: user.clerkId,
        email: user.email,
        planId: user.planId,
      });

      await user.save();
      await user.populate("planId");
      console.log("New user created and saved successfully");
    }

    // Return user profile
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          plan: {
            name: user.planId.name,
            displayName: user.planId.displayName,
            dailyLimit: user.planId.dailyLimit,
            monthlyLimit: user.planId.monthlyLimit,
          },
          settings: user.settings,
          lastActive: user.lastActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("GET /api/user error:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// DELETE /api/user - Delete user profile and all associated data
export async function DELETE(request: NextRequest) {
  console.log("DELETE /api/user", request.cookies.size || "no cookies");
  try {
    // Get authenticated user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user in our database
    const user = await User.findOne({ clerkId: clerkUser.id });
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Delete all user-related data
    const userId = user._id;

    // Import models dynamically to avoid circular dependency issues
    const { Usage, Prompt } = await import("@/lib/models");

    // Delete in parallel for better performance
    await Promise.all([
      Usage.deleteMany({ userId }),
      Prompt.deleteMany({ userId }),
      User.deleteOne({ _id: userId }),
    ]);

    console.log(`User deleted: ${clerkUser.id} (${user.email})`);

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message:
          "User profile and all associated data have been permanently deleted",
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("DELETE /api/user error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders() }
    );
  }
}
