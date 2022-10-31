import { functionsList } from "$lib/get-data";
import { handle } from "$lib/handler";

async function handleRequest({ params, locals, request }) {
  if (!locals.project && request.method === "GET") {
    return functionsList(params.name);
  }

  const result = await handle({
    project: locals.project,
    name: params.name,
    request,
  });
  console.timeEnd("handleRequest");
  return result;
}

export { handleRequest as GET };
export { handleRequest as POST };
export { handleRequest as PUT };
export { handleRequest as DELETE };
