export async function GET({ locals }) {
  return new Response("Server is running\n\nProject: " + locals.project);
}
