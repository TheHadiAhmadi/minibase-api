export async function handle({ event, resolve }) {
  const url = new URL(event.request.url);

  let project = null;

  const segments = url.hostname.split(".");
  if (segments.length == 1 && segments[0] == "localhost") {
    project = url.searchParams.get("project");
  }

  if (segments.length > 2) {
    project = segments[0];
  }

  event.locals.project = project;
  return await resolve(event);
}
