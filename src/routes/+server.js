import { functionsList } from "../lib/get-data";

export async function GET({ locals }) {
  return functionsList(locals.project);
}
