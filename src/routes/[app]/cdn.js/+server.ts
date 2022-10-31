import { functionsList } from "$lib/runner/get-data";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
  return functionsList(params.app, "cdn");
}
