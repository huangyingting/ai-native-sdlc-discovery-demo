import { getTicketStore } from "@/lib/ticket-store";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    getTicketStore().summary();
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error) {
      for (const key of Object.keys(error)) Reflect.deleteProperty(error, key);
      Reflect.deleteProperty(error, "cause");
      error.name = "Error";
      error.message = "Storage operation failed";
      error.stack = undefined;
    }
    console.error("Service desk readiness check failed");
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
