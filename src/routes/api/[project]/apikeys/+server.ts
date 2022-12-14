import {
  addApiKey,
  getApiKeys,
  respond,
  ResponseError,
  validateApiKey,
} from "$lib/server/services";
import { APIKEY_SCOPES } from "$lib/types";
import type { RequestEvent } from "./$types";

export async function GET({ params, locals }: RequestEvent) {
  await validateApiKey(params.project, locals.apiKey, [
    APIKEY_SCOPES.PROJECT_ADMIN,
  ]);

  const data = await getApiKeys({ project: params.project });
  return respond({ data });
}

export async function POST({ request, params, locals }: RequestEvent) {
  await validateApiKey(params.project, locals.apiKey, [
    APIKEY_SCOPES.PROJECT_ADMIN,
  ]);
  const body = await request.json();

  if (!body.name || !body.scopes) {
    throw new ResponseError(400, "body should have name and scopes field");
  }

  const data = await addApiKey({ project: params.project, body });
  return respond({ data });
}
