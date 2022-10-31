import { handle } from "$lib/runner/handler";
import type { RequestEvent } from "./$types";

export async function POST({ params, request }: RequestEvent) {
  // run function
  return handle({ project: params.app, name: params.fn, request });
}
