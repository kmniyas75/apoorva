import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ensureStoreDatabaseLoaded,
  persistStoreDatabase
} from "@/lib/store/adminStore";

const ADMIN_COOKIE_NAME = "apoorva_admin_session";
const ADMIN_SESSION_VALUE = "apoorva_authenticated_session_v1";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    const isAuthenticated = token === ADMIN_SESSION_VALUE;
    return NextResponse.json({
      authenticated: isAuthenticated
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, password, newPassword } = body as {
      action: "login" | "logout" | "change_password";
      password?: string;
      newPassword?: string;
    };

    const db = await ensureStoreDatabaseLoaded();
    const expectedPassword =
      db.settings.adminPassword || process.env.ADMIN_PASSWORD || "apoorva2026";

    if (action === "logout") {
      const res = NextResponse.json({
        success: true,
        authenticated: false,
        message: "Logged out of Admin Studio."
      });
      res.cookies.delete(ADMIN_COOKIE_NAME);
      return res;
    }

    if (action === "change_password") {
      if (!newPassword || newPassword.trim().length < 4) {
        return NextResponse.json(
          { error: "New password must be at least 4 characters." },
          { status: 400 }
        );
      }
      db.settings.adminPassword = newPassword.trim();
      await persistStoreDatabase(db);
      return NextResponse.json({
        success: true,
        message: "Admin password updated successfully."
      });
    }

    // Default: login
    if (!password || password.trim() !== expectedPassword) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "Invalid admin password. Please try again."
        },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      success: true,
      authenticated: true,
      message: "Welcome to APOORVA Admin Control Studio."
    });

    res.cookies.set(ADMIN_COOKIE_NAME, ADMIN_SESSION_VALUE, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

