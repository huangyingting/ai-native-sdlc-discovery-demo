import { getTicketStore } from "@/lib/ticket-store";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    getTicketStore().summary();
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Service desk readiness check failed");
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
