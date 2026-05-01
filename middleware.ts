import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const user = process.env.DASHBOARD_BASIC_AUTH_USER;
  const password = process.env.DASHBOARD_BASIC_AUTH_PASSWORD;

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!user || !password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Dashboard Basic Auth is not configured", { status: 500 });
    }
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    const decoded = encoded ? atob(encoded) : "";
    const [providedUser, providedPassword] = decoded.split(":");

    if (scheme === "Basic" && providedUser === user && providedPassword === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AI Automation Lead Engine"'
    }
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
