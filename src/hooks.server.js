export async function handle({ event, resolve }) {
  if (event.request.method === "OPTIONS") {
    const response = new Response(undefined, {
      status: 200,
    });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "*");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization,Content-Type"
    );
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    return response;
  }

  const url = new URL(event.request.url);

  let project = null;

  // subdomain
  const splitted = url.hostname.split(".");

  if (splitted.length > 2) {
    project = splitted[0];
  }

  // query parameter
  if (!project) project = url.searchParams.get("project");

  event.locals.project = project;

  /** @type {Response} */
  const response = await resolve(event);

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "*");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization,content-type"
  );
  response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  return response;
}
