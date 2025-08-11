import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models";
import { ApiResponse, ApiKeyRequest, ApiKeyResponse } from "@/lib/types";
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

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes key for AES-256

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY environment variable is required");
}

// Helper function to encrypt API key
function encryptApiKey(apiKey: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY!, "hex"),
    iv
  );

  let encryptedKey = cipher.update(apiKey, "utf8", "hex");
  encryptedKey += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return {
    encryptedKey,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

// Helper function to decrypt API key
function decryptApiKey(encryptedKey: string, iv: string, tag: string) {
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY!, "hex"),
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(tag, "hex"));

  let decrypted = decipher.update(encryptedKey, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Helper function to validate API key format
function isValidApiKeyFormat(provider: string, apiKey: string): boolean {
  if (!apiKey?.trim()) return false;

  console.log("isValidApiKeyFormat", provider, apiKey);

  // OpenAI: Multiple formats supported
  if (provider === "openai") {
    // Legacy format: starts with 'sk-' and is 51 characters
    if (/^sk-[A-Za-z0-9]{48}$/.test(apiKey)) {
      return true;
    }

    // New project-based format: starts with 'sk-proj-' and is much longer
    if (/^sk-proj-[A-Za-z0-9_-]{100,200}$/.test(apiKey)) {
      return true;
    }

    // General OpenAI format: starts with 'sk-' followed by reasonable length
    if (/^sk-[A-Za-z0-9_-]{20,200}$/.test(apiKey)) {
      return true;
    }

    return false;
  }

  // Anthropic: starts with 'sk-ant-' and is reasonable length
  if (provider === "anthropic") {
    return /^sk-ant-[A-Za-z0-9]{24,96}$/.test(apiKey);
  }

  return false;
}

// GET /api/user/api-keys - Get user's API keys (decrypted)
export async function GET(request: NextRequest) {
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

    // Find user and explicitly select encrypted fields
    const user = await User.findOne({ clerkId: clerkUser.id })
      .select(
        "+apiKeys.openai.encryptedKey +apiKeys.openai.iv +apiKeys.openai.tag"
      )
      .select(
        "+apiKeys.anthropic.encryptedKey +apiKeys.anthropic.iv +apiKeys.anthropic.tag"
      );

    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Get provider from query params
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") as
      | "openai"
      | "anthropic"
      | null;

    // Record access attempt in audit log
    const userAgent = request.headers.get("user-agent");
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Prepare response in the format the extension expects
    const apiKeys: {
      openaiKey: string;
      anthropicKey: string;
      openaiKeyInfo: {
        exists: boolean;
        masked?: string;
        lastUpdated?: Date;
        isValid?: boolean;
        provider: string;
        error?: string;
      } | null;
      anthropicKeyInfo: {
        exists: boolean;
        masked?: string;
        lastUpdated?: Date;
        isValid?: boolean;
        provider: string;
        error?: string;
      } | null;
    } = {
      openaiKey: "",
      anthropicKey: "",
      openaiKeyInfo: null,
      anthropicKeyInfo: null,
    };

    if (!provider || provider === "openai") {
      const openaiKey = user.apiKeys?.openai;
      if (openaiKey?.encryptedKey) {
        try {
          // Decrypt key
          const decrypted = decryptApiKey(
            openaiKey.encryptedKey,
            openaiKey.iv,
            openaiKey.tag
          );

          // Add to audit log
          try {
            await (user as any).addApiKeyAudit("accessed", "openai", {
              ipAddress: ip,
              userAgent,
              success: true,
            });
          } catch (auditError) {
            console.warn("Failed to add audit log:", auditError);
          }

          apiKeys.openaiKey = decrypted;
          apiKeys.openaiKeyInfo = {
            exists: true,
            masked: `sk-...${decrypted.slice(-4)}`,
            lastUpdated: openaiKey.lastUpdated,
            isValid: openaiKey.isValid,
            provider: "openai",
          };
        } catch (error) {
          console.error("Failed to decrypt OpenAI key:", error);
          try {
            await (user as any).addApiKeyAudit("accessed", "openai", {
              ipAddress: ip,
              userAgent,
              success: false,
              error: "Decryption failed",
            });
          } catch (auditError) {
            console.warn("Failed to add audit log:", auditError);
          }

          // Still show that key exists but is invalid
          apiKeys.openaiKeyInfo = {
            exists: true,
            masked: "sk-...Invalid",
            lastUpdated: openaiKey.lastUpdated,
            isValid: false,
            provider: "openai",
            error: "Decryption failed",
          };
        }
      } else {
        apiKeys.openaiKeyInfo = {
          exists: false,
          provider: "openai",
        };
      }
    }

    if (!provider || provider === "anthropic") {
      const anthropicKey = user.apiKeys?.anthropic;
      if (anthropicKey?.encryptedKey) {
        try {
          // Decrypt key
          const decrypted = decryptApiKey(
            anthropicKey.encryptedKey,
            anthropicKey.iv,
            anthropicKey.tag
          );

          // Add to audit log
          try {
            await (user as any).addApiKeyAudit("accessed", "anthropic", {
              ipAddress: ip,
              userAgent,
              success: true,
            });
          } catch (auditError) {
            console.warn("Failed to add audit log:", auditError);
          }

          apiKeys.anthropicKey = decrypted;
          apiKeys.anthropicKeyInfo = {
            exists: true,
            masked: `sk-ant-...${decrypted.slice(-4)}`,
            lastUpdated: anthropicKey.lastUpdated,
            isValid: anthropicKey.isValid,
            provider: "anthropic",
          };
        } catch (error) {
          console.error("Failed to decrypt Anthropic key:", error);
          try {
            await (user as any).addApiKeyAudit("accessed", "anthropic", {
              ipAddress: ip,
              userAgent,
              success: false,
              error: "Decryption failed",
            });
          } catch (auditError) {
            console.warn("Failed to add audit log:", auditError);
          }

          // Still show that key exists but is invalid
          apiKeys.anthropicKeyInfo = {
            exists: true,
            masked: "sk-ant-...Invalid",
            lastUpdated: anthropicKey.lastUpdated,
            isValid: false,
            provider: "anthropic",
            error: "Decryption failed",
          };
        }
      } else {
        apiKeys.anthropicKeyInfo = {
          exists: false,
          provider: "anthropic",
        };
      }
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { apiKeys },
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("GET /api/user/api-keys error:", error);
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

// PUT /api/user/api-keys - Update API keys (for extension compatibility)
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Parse request body
    const body = await request.json();
    const { apiKeys } = body;

    console.log("PUT /api/user/api-keys received:", {
      hasOpenaiKey: apiKeys?.hasOwnProperty("openaiKey"),
      hasAnthropicKey: apiKeys?.hasOwnProperty("anthropicKey"),
      openaiKeyType: typeof apiKeys?.openaiKey,
      anthropicKeyType: typeof apiKeys?.anthropicKey,
      openaiKeyEmpty: apiKeys?.openaiKey === "",
      anthropicKeyEmpty: apiKeys?.anthropicKey === "",
    });

    if (!apiKeys || typeof apiKeys !== "object") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid API keys data" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user
    const user = await User.findOne({ clerkId: clerkUser.id });
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Get request metadata for audit log
    const userAgent = request.headers.get("user-agent");
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const results: {
      openai: { success: boolean; lastUpdated?: Date; error?: string } | null;
      anthropic: {
        success: boolean;
        lastUpdated?: Date;
        error?: string;
      } | null;
    } = { openai: null, anthropic: null };
    let hasUpdates = false;

    // Initialize apiKeys if not exists
    if (!user.apiKeys) {
      user.apiKeys = {
        openai: {
          encryptedKey: "",
          iv: "",
          tag: "",
          isValid: false,
          lastUpdated: new Date(),
        },
        anthropic: {
          encryptedKey: "",
          iv: "",
          tag: "",
          isValid: false,
          lastUpdated: new Date(),
        },
      };
    }

    // Update OpenAI key if provided
    if (apiKeys.hasOwnProperty("openaiKey")) {
      const openaiKey = apiKeys.openaiKey?.trim();

      if (openaiKey) {
        // Update with new key
        // Validate API key format
        if (!isValidApiKeyFormat("openai", openaiKey)) {
          console.log("Invalid OpenAI API key format", openaiKey);
          return NextResponse.json<ApiResponse>(
            { success: false, error: "Invalid OpenAI API key format" },
            { status: 400, headers: corsHeaders() }
          );
        }

        try {
          // Encrypt API key
          const { encryptedKey, iv, tag } = encryptApiKey(openaiKey);

          const now = new Date();
          user.apiKeys.openai = {
            encryptedKey,
            iv,
            tag,
            isValid: true,
            lastUpdated: now,
          };

          // Add audit log
          try {
            await (user as any).addApiKeyAudit("updated", "openai", {
              ipAddress: ip,
              userAgent,
              success: true,
            });
          } catch (auditError) {
            console.warn("Failed to add audit log:", auditError);
          }

          results.openai = { success: true, lastUpdated: now };
          hasUpdates = true;
        } catch (error) {
          console.error("Failed to encrypt OpenAI key:", error);
          try {
            await (user as any).addApiKeyAudit("updated", "openai", {
              ipAddress: ip,
              userAgent,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          } catch (auditError) {
            console.warn("Failed to add audit log:", auditError);
          }

          results.openai = { success: false, error: "Failed to encrypt key" };
        }
      } else if (openaiKey === "") {
        // Delete key (empty string provided explicitly)
        try {
          const now = new Date();
          user.apiKeys.openai = {
            encryptedKey: "",
            iv: "",
            tag: "",
            isValid: false,
            lastUpdated: now,
          };

          // Add audit log
          try {
            await (user as any).addApiKeyAudit("deleted", "openai", {
              ipAddress: ip,
              userAgent,
              success: true,
            });
          } catch (auditError) {
            console.warn("Failed to add audit log:", auditError);
          }

          results.openai = { success: true, lastUpdated: now };
          hasUpdates = true;
        } catch (error) {
          console.error("Failed to delete OpenAI key:", error);
          results.openai = { success: false, error: "Failed to delete key" };
        }
      }
      // If openaiKey is undefined or null, we skip processing it
    }

    // Update Anthropic key if provided
    if (apiKeys.hasOwnProperty("anthropicKey")) {
      const anthropicKey = apiKeys.anthropicKey?.trim();

      if (anthropicKey) {
        // Update with new key
        // Validate API key format
        if (!isValidApiKeyFormat("anthropic", anthropicKey)) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: "Invalid Anthropic API key format" },
            { status: 400, headers: corsHeaders() }
          );
        }

        try {
          // Encrypt API key
          const { encryptedKey, iv, tag } = encryptApiKey(anthropicKey);

          const now = new Date();
          user.apiKeys.anthropic = {
            encryptedKey,
            iv,
            tag,
            isValid: true,
            lastUpdated: now,
          };

          // Add audit log
          try {
            await (user as any).addApiKeyAudit("updated", "anthropic", {
              ipAddress: ip,
              userAgent,
              success: true,
            });
          } catch (auditError) {
            console.warn("Failed to add audit log:", auditError);
          }

          results.anthropic = { success: true, lastUpdated: now };
          hasUpdates = true;
        } catch (error) {
          console.error("Failed to encrypt Anthropic key:", error);
          try {
            await (user as any).addApiKeyAudit("updated", "anthropic", {
              ipAddress: ip,
              userAgent,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          } catch (auditError) {
            console.warn("Failed to add audit log:", auditError);
          }

          results.anthropic = {
            success: false,
            error: "Failed to encrypt key",
          };
        }
      } else if (anthropicKey === "") {
        // Delete key (empty string provided explicitly)
        try {
          const now = new Date();
          user.apiKeys.anthropic = {
            encryptedKey: "",
            iv: "",
            tag: "",
            isValid: false,
            lastUpdated: now,
          };

          // Add audit log
          try {
            await (user as any).addApiKeyAudit("deleted", "anthropic", {
              ipAddress: ip,
              userAgent,
              success: true,
            });
          } catch (auditError) {
            console.warn("Failed to add audit log:", auditError);
          }

          results.anthropic = { success: true, lastUpdated: now };
          hasUpdates = true;
        } catch (error) {
          console.error("Failed to delete Anthropic key:", error);
          results.anthropic = { success: false, error: "Failed to delete key" };
        }
      }
      // If anthropicKey is undefined or null, we skip processing it
    }

    // Save user if there were updates
    if (hasUpdates) {
      await user.save();
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: hasUpdates
          ? "API keys updated successfully"
          : "No keys to update",
        data: { results, hasUpdates },
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error("PUT /api/user/api-keys error:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Failed to update API keys",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// POST /api/user/api-keys - Store new API key
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Parse request body
    const body: ApiKeyRequest = await request.json();
    const { provider, apiKey } = body;

    console.log("POST /api/user/api-keys", body);
    console.log("POST /api/user/api-keys", provider, apiKey);

    // Validate required fields
    if (!provider || !apiKey) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Missing required fields: provider, apiKey",
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate API key format
    if (!isValidApiKeyFormat(provider, apiKey)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Invalid ${provider} API key format`,
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user
    const user = await User.findOne({ clerkId: clerkUser.id });
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Get request metadata for audit log
    const userAgent = request.headers.get("user-agent");
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    try {
      // Encrypt API key
      const { encryptedKey, iv, tag } = encryptApiKey(apiKey);

      // Update user's API keys
      if (!user.apiKeys) {
        user.apiKeys = {
          openai: {
            encryptedKey: "",
            iv: "",
            tag: "",
            isValid: false,
            lastUpdated: new Date(),
          },
          anthropic: {
            encryptedKey: "",
            iv: "",
            tag: "",
            isValid: false,
            lastUpdated: new Date(),
          },
        };
      }

      const now = new Date();
      if (provider === "openai") {
        user.apiKeys.openai = {
          encryptedKey,
          iv,
          tag,
          isValid: true,
          lastUpdated: now,
        };
      } else {
        user.apiKeys.anthropic = {
          encryptedKey,
          iv,
          tag,
          isValid: true,
          lastUpdated: now,
        };
      }

      await user.save();

      // Add audit log
      try {
        await (user as any).addApiKeyAudit("created", provider, {
          ipAddress: ip,
          userAgent,
          success: true,
        });
      } catch (auditError) {
        console.warn("Failed to add audit log:", auditError);
      }

      return NextResponse.json<ApiResponse<ApiKeyResponse>>(
        {
          success: true,
          message: `${provider} API key stored successfully`,
          data: {
            provider,
            isValid: true,
            lastUpdated: now,
          },
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      // Add failed attempt to audit log
      try {
        await (user as any).addApiKeyAudit("created", provider, {
          ipAddress: ip,
          userAgent,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (auditError) {
        console.warn("Failed to add audit log:", auditError);
      }

      throw error;
    }
  } catch (error) {
    console.error("POST /api/user/api-keys error:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Failed to store API key",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// DELETE /api/user/api-keys - Remove API key
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Get provider from query params
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") as
      | "openai"
      | "anthropic"
      | null;

    if (!provider) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Missing required query parameter: provider",
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user
    const user = await User.findOne({ clerkId: clerkUser.id });
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User not found" },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Get request metadata for audit log
    const userAgent = request.headers.get("user-agent");
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    try {
      // Remove API key
      if (provider === "openai") {
        user.apiKeys.openai = {
          encryptedKey: "",
          iv: "",
          tag: "",
          isValid: false,
          lastUpdated: new Date(),
        };
      } else {
        user.apiKeys.anthropic = {
          encryptedKey: "",
          iv: "",
          tag: "",
          isValid: false,
          lastUpdated: new Date(),
        };
      }

      await user.save();

      // Add audit log
      try {
        await (user as any).addApiKeyAudit("deleted", provider, {
          ipAddress: ip,
          userAgent,
          success: true,
        });
      } catch (auditError) {
        console.warn("Failed to add audit log:", auditError);
      }

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          message: `${provider} API key removed successfully`,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      // Add failed attempt to audit log
      try {
        await (user as any).addApiKeyAudit("deleted", provider, {
          ipAddress: ip,
          userAgent,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (auditError) {
        console.warn("Failed to add audit log:", auditError);
      }

      throw error;
    }
  } catch (error) {
    console.error("DELETE /api/user/api-keys error:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Failed to remove API key",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}
