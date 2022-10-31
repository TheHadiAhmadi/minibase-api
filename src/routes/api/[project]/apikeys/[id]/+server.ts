import { removeApiKey, respond, validateApiKey } from "$lib/server/services";
import { APIKEY_SCOPES } from "$lib/types";
import type { RequestEvent } from "./$types";

export async function DELETE({ params, locals }: RequestEvent) {
  await validateApiKey(params.project, locals.apiKey, [
    APIKEY_SCOPES.PROJECT_ADMIN,
  ]);

  const data = await removeApiKey({ id: params.id, project: params.project });

  return respond({ data });
}
