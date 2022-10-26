import { createDB } from "./create-db";
import { getRequiredData } from "./get-data";
import { respond } from "./utils";
import { runJS } from "./vm";

export async function handle({ project, name, request }) {
  if (request.method !== "POST")
    return respond({
      message: "Method is Not supported, Only POST method is allowed",
    });

  console.time("handle");
  try {
    console.log("handle", { project, name });
    if (!project) error("Project not found", 404);

    const { code, env, collectionsList } = await getRequiredData({
      project,
      name,
    });

    const collections = collectionsList.reduce((prev, collection) => {
      prev[collection] = createDB(project, collection);
      return prev;
    }, {});

    const response = await runJS(request, code, env, collections);
    console.timeEnd("handle");
    return response;
  } catch (err) {
    const er = JSON.parse(err.message);
    console.timeEnd("handle");
    return respond({ message: er.message, status: er.status }, er.status);
  }
}
