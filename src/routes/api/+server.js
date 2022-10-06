export async function GET({ locals }) {
  const project = locals.project;

  return new Response("API + fn " + project);
}
