import { handle } from "../../lib/handler";

async function handleRequest({ params, locals, request }) {
  return handle({
    project: locals.project,
    name: params.name,
    request,
  });
}

export { handleRequest as GET };
export { handleRequest as POST };
export { handleRequest as PUT };
export { handleRequest as DELETE };