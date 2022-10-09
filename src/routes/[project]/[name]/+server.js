import { handle } from "../../../lib/handler";

async function handleRequest({ params, request }) {
  return handle({
    project: params.project,
    name: params.name,
    request,
  });
}

export { handleRequest as GET };
export { handleRequest as POST };
export { handleRequest as PUT };
export { handleRequest as DELETE };
