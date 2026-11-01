import { announcementsCrud, type Announcement } from "@/lib/store";
import { collectionRoutes } from "@/lib/admin-routes";

export const dynamic = "force-dynamic";

const routes = collectionRoutes<Announcement>({
  crud: announcementsCrud,
  key: "announcements",
  itemKey: "announcement",
  noun: "announcement",
  schema: {
    title: { type: "string", required: true, max: 160 },
    body: { type: "text", required: true, max: 3000, label: "Message" },
    priority: { type: "enum", values: ["normal", "urgent"] },
    expiresOn: { type: "date", label: "Show until" },
    active: { type: "boolean" },
  },
  defaults: () => ({ priority: "normal", active: true, created_at: new Date().toISOString() }),
});

export const GET = routes.GET;
export const POST = routes.POST;
export const PUT = routes.PUT;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
