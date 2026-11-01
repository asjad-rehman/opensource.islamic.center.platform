import { boardCrud, type BoardMember } from "@/lib/store";
import { collectionRoutes } from "@/lib/admin-routes";

export const dynamic = "force-dynamic";

const routes = collectionRoutes<BoardMember>({
  crud: boardCrud,
  key: "board",
  itemKey: "member",
  noun: "board member",
  schema: {
    name: { type: "string", required: true, max: 120 },
    role: { type: "string", required: true, max: 120 },
  },
  defaults: {},
});

export const GET = routes.GET;
export const POST = routes.POST;
export const PUT = routes.PUT;
export const PATCH = routes.PATCH;
export const DELETE = routes.DELETE;
