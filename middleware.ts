import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/login",
  },
});

export const config = {
  matcher: [
    // Proteger todas las rutas del dashboard, finanzas, clientes, avisos, configuracion y API endpoints (excepto las públicas)
    "/",
    "/finanzas/:path*",
    "/clientes/:path*",
    "/avisos/:path*",
    "/configuracion/:path*",
    "/api/finanzas/:path*",
    "/api/clientes/:path*",
    "/api/avisos/:path*",
    "/api/configuracion/:path*",
  ],
};
