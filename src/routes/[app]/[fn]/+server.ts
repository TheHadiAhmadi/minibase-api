import { handle } from "$lib/runner/handler";
import type { RequestEvent } from "./$types";

export async function POST({ params, request }: RequestEvent) {
  // run function
  return handle({ project: params.app, name: params.fn, request });
}

export async function GET({ params, request }: RequestEvent) {
  // run function
  return handle({ project: params.app, name: params.fn, request });
}

export async function PUT({ params, request }: RequestEvent) {
  // run function
  return handle({ project: params.app, name: params.fn, request });
}

export async function DELETE({ params, request }: RequestEvent) {
  // run function
  return handle({ project: params.app, name: params.fn, request });
}
