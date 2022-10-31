export function error(message: string, status: number, stack = "") {
  throw new Error(JSON.stringify({ message, status, stack }));
}

export function respond(body: any, status: number = 200) {
  return new Response(JSON.stringify(body), { status });
}
