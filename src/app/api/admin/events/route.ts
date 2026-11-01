import { eventsCrud, EVENT_CATEGORIES, type EventItem } from "@/lib/store";
import { collectionRoutes } from "@/lib/admin-routes";

export const dynamic = "force-dynamic";

const routes = collectionRoutes<EventItem>({
  crud: eventsCrud,
  key: "events",
  itemKey: "event",
  noun: "event",
  schema: {
    title: { type: "string", required: true, max: 160 },
    description: { type: "text", required: true, max: 4000 },
    date: { type: "date", required: true },
    time: { type: "time", label: "Start time" },
    endTime: { type: "time", label: "End time" },
    location: { type: "string", max: 200 },
    category: { type: "enum", values: EVENT_CATEGORIES },
    featured: { type: "boolean" },
    recurring: { type: "boolean" },
  },
  defaults: { featured: false, recurring: false, category: "community" },
});

export const GET = routes.GET;
export const POST = routes.POST;
export const PUT = routes.PUT;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
