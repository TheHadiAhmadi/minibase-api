import { createDB } from "./create-db";
import { getRequiredData } from "./get-data";
import { respond } from "./utils";
import { runJS } from "./vm";

export async function handle({ project, name, request }) {
  try {
    if (!project) error("Project not found", 404);

    const { code, env, collectionsList } = await getRequiredData({
      project,
      name,
    });

    const collections = collectionsList.reduce((prev, collection) => {
      prev[collection] = createDB(project, collection);
      return prev;
    }, {});

    console.log("BEFORE RUNJS");
    const response = await runJS(request, code, env, collections);
    console.log("AFTER RUNJS");
    return response;
  } catch (err) {
    const er = JSON.parse(err.message);
    return respond({ message: er.message, status: er.status }, er.status);
  }
}
