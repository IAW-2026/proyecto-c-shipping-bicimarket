import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rutas públicas: sin JWT de Clerk.
// - "/" landing
// - "/sign-in", "/sign-up" del propio Clerk
// - "/api/health" para checks de Dokploy/Vercel
// - "/api/internal/*" autenticadas con X-Service-Token (otra app del marketplace)
// - "/webhooks/mercadopago" SOLO si esta es la Payments App (firma propia de MP)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/internal(.*)",
  "/webhooks/mercadopago",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
