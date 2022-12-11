import { deployProject } from "$lib/runner/deploy";
import { respond, validateApiKey } from "$lib/server/services";
import { APIKEY_SCOPES } from "$lib/types";
import type { RequestEvent } from "./$types";

export async function POST({ request, locals, params }: RequestEvent) {
  await validateApiKey(params.project, locals.apiKey, [
    APIKEY_SCOPES.PROJECT_ADMIN,
  ]);

  const body = await request.json()
  const data = await deployProject(body);

  return respond({ data });
}
