export function error(message, status, stack = "") {
  throw new Error(JSON.stringify({ message, status, stack }));
}

export function respond(body, status) {
  return new Response(JSON.stringify(body), { status });
}
