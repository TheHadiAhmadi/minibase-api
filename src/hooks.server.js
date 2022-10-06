export async function handle({ event, resolve }) {
  const url = new URL(event.request.url);

  let project = null;

  const segments = url.hostname.split(".");
  if (segments.length == 2 && segments[1] == "localhost") {
    project = segments[0];
  } else if (segments.length > 2) {
    project = segments[0];
  }

  event.locals.project = project;
  return await resolve(event);
}
