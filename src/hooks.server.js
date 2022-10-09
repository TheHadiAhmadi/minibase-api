export async function handle({ event, resolve }) {
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
  return await resolve(event);
}
