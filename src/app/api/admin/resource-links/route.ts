import { resourceLinksCrud, type ResourceLink } from "@/lib/store";
import { collectionRoutes } from "@/lib/admin-routes";

export const dynamic = "force-dynamic";

const routes = collectionRoutes<ResourceLink>({
  crud: resourceLinksCrud,
  key: "links",
  itemKey: "item",
  noun: "link",
  schema: {
    category: { type: "string", required: true, max: 80 },
    categoryIcon: { type: "string", max: 16, label: "Category icon" },
    label: { type: "string", required: true, max: 200, label: "Link name" },
    url: { type: "url", required: true, label: "Web address" },
    order: { type: "number", min: 1, max: 999, label: "Position" },
  },
  defaults: { categoryIcon: "🔗", order: 99 },
});

export const GET = routes.GET;
export const POST = routes.POST;
export const PUT = routes.PUT;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
