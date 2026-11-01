import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { parsePayload, type Schema } from "@/lib/validate";

type Crud<T> = {
  list: (bypassCache?: boolean) => Promise<T[]>;
  add: (data: Omit<T, "id">) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T | null>;
  remove: (id: string) => Promise<void>;
  reorder: (ids: string[]) => Promise<T[]>;
};

export function unauthorized() {
  return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
}

export function serverError(action: string, e: unknown) {
  console.error(`[admin] ${action} failed:`, e);
  return NextResponse.json({ error: `Couldn't ${action}. Please try again in a moment.` }, { status: 500 });
}

async function readJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/**
 * Standard admin CRUD handlers for a list collection.
 *  GET    – list (public; content is shown on the site anyway)
 *  POST   – create      PUT – update (partial)
 *  DELETE – ?id=        PATCH – { ids: [...] } reorder
 */
export function collectionRoutes<T extends { id: string }>(opts: {
  crud: Crud<T>;
  schema: Schema;
  key: string;          // response key for the list, e.g. "board"
  itemKey: string;      // response key for one item, e.g. "member"
  noun: string;         // human name, e.g. "board member"
  defaults?: Partial<T> | (() => Partial<T>);
}) {
  const { crud, schema, key, itemKey, noun, defaults = {} } = opts;
  const getDefaults = () => (typeof defaults === "function" ? defaults() : defaults);

  return {
    GET: async () => {
      try {
        return NextResponse.json({ [key]: await crud.list(true) });
      } catch (e) {
        return serverError(`load ${noun}s`, e);
      }
    },

    POST: async (req: NextRequest) => {
      if (!getAdminUser(req)) return unauthorized();
      const parsed = parsePayload(schema, await readJson(req));
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      try {
        const item = await crud.add({ ...getDefaults(), ...parsed.data } as unknown as Omit<T, "id">);
        return NextResponse.json({ success: true, [itemKey]: item });
      } catch (e) {
        return serverError(`save the ${noun}`, e);
      }
    },

    PUT: async (req: NextRequest) => {
      if (!getAdminUser(req)) return unauthorized();
      const body = await readJson(req);
      const id = typeof body?.id === "string" ? body.id : "";
      if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
      const parsed = parsePayload(schema, body, true);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      try {
        const item = await crud.update(id, parsed.data as Partial<T>);
        if (!item) return NextResponse.json({ error: `That ${noun} no longer exists — refresh the page.` }, { status: 404 });
        return NextResponse.json({ success: true, [itemKey]: item });
      } catch (e) {
        return serverError(`update the ${noun}`, e);
      }
    },

    PATCH: async (req: NextRequest) => {
      if (!getAdminUser(req)) return unauthorized();
      const body = await readJson(req);
      const ids = body?.ids;
      if (!Array.isArray(ids) || !ids.every((x: unknown) => typeof x === "string")) {
        return NextResponse.json({ error: "ids must be a list." }, { status: 400 });
      }
      try {
        return NextResponse.json({ success: true, [key]: await crud.reorder(ids) });
      } catch (e) {
        return serverError(`reorder ${noun}s`, e);
      }
    },

    DELETE: async (req: NextRequest) => {
      if (!getAdminUser(req)) return unauthorized();
      const id = req.nextUrl.searchParams.get("id");
      if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
      try {
        await crud.remove(id);
        return NextResponse.json({ success: true });
      } catch (e) {
        return serverError(`delete the ${noun}`, e);
      }
    },
  };
}
