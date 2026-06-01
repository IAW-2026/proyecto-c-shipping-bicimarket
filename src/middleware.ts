import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rutas públicas desde el punto de vista del middleware (Clerk no enforce JWT).
// Cada route handler hace su propia auth con auth() / requireServiceToken /
// isAdmin según corresponda.
//
// - "/" landing
// - "/sign-in", "/sign-up" del propio Clerk
// - "/api/health" para checks de Dokploy/Vercel
// - "/api/internal/*" autenticadas con X-Service-Token (otra app del marketplace)
// - "/api/v1/*" mixto: la mayoría requieren JWT (auth() en el handler), algunos
//   son S2S (requireServiceToken) y otros aceptan ambos. Cada handler decide.
// - "/webhooks/mercadopago" SOLO si esta es la Payments App (no en Shipping)
// - "/track/*" tracking público (cualquiera con el código puede ver el estado)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/track(.*)",
  "/wiki(.*)",
  "/api/health",
  "/api/internal(.*)",
  "/api/v1(.*)",
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
