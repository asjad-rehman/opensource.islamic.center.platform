import { impactCrud, type ImpactItem } from "@/lib/store";
import { collectionRoutes } from "@/lib/admin-routes";

export const dynamic = "force-dynamic";

const routes = collectionRoutes<ImpactItem>({
  crud: impactCrud,
  key: "impact",
  itemKey: "item",
  noun: "impact story",
  schema: {
    title: { type: "string", required: true, max: 160 },
    description: { type: "text", required: true, max: 5000 },
    count: { type: "string", max: 60, label: "Highlight" },
    image: { type: "url", allowRelative: true },
  },
  defaults: {},
});

export const GET = routes.GET;
export const POST = routes.POST;
export const PUT = routes.PUT;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
