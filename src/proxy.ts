import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/calendario",
  "/lista",
  "/contas-a-pagar",
  "/contas-a-receber",
  "/receitas",
  "/despesas",
  "/dividas",
  "/contas",
  "/configuracoes",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Verificação otimista: a validação real da sessão acontece no servidor.
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/calendario/:path*",
    "/lista/:path*",
    "/contas-a-pagar/:path*",
    "/contas-a-receber/:path*",
    "/receitas/:path*",
    "/despesas/:path*",
    "/dividas/:path*",
    "/contas/:path*",
    "/configuracoes/:path*",
  ],
};
