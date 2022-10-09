export function error(message, status) {
  throw new Error(JSON.stringify({ message, status }));
}

export function respond(body, status) {
  return new Response(JSON.stringify(body), { status });
}
