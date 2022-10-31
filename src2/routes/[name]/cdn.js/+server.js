import { functionsList } from "$lib/get-data";

export async function GET({ params }) {
  return functionsList(params.name, "cdn");
}
