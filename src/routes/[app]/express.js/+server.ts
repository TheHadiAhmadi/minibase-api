import { getExpressCode } from "$lib/runner/get-express-code";
import { getProject } from "$lib/server/services";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
    const project = await getProject({name: params.app})

    return new Response(getExpressCode(await project.collections, await project.functions), {
    headers: { "Content-Type": "text/javascript" },
  });
}
