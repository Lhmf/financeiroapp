import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

const vercelDeploymentUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : null;
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : null;
const appUrl =
  process.env.BETTER_AUTH_URL ??
  vercelProductionUrl ??
  vercelDeploymentUrl ??
  "http://localhost:3000";

const trustedOrigins = Array.from(
  new Set(
    [appUrl, vercelProductionUrl, vercelDeploymentUrl].filter(
      (origin): origin is string => Boolean(origin),
    ),
  ),
);

export const auth = betterAuth({
  appName: "FinanceiroApp",
  baseURL: appUrl,
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    database: {
      joins: true,
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];
