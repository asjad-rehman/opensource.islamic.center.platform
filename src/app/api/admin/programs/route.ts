import { programsCrud, type Program } from "@/lib/store";
import { collectionRoutes } from "@/lib/admin-routes";

export const dynamic = "force-dynamic";

const routes = collectionRoutes<Program>({
  crud: programsCrud,
  key: "programs",
  itemKey: "item",
  noun: "program",
  schema: {
    icon: { type: "string", max: 16 },
    title: { type: "string", required: true, max: 160 },
    schedule: { type: "string", max: 200 },
    note: { type: "string", max: 200, label: "Status note" },
    description: { type: "text", required: true, max: 2000 },
    active: { type: "boolean" },
  },
  defaults: { icon: "📌", schedule: "", note: "", active: true },
});

export const GET = routes.GET;
export const POST = routes.POST;
export const PUT = routes.PUT;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
