import { getClientSideCode } from "$lib/runner/get-data";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
  return new Response(await getClientSideCode(params.app, "cdn"), {
    headers: { "Content-Type": "text/javascript" },
  });
}
