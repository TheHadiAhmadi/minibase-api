import db from "./db";
import { error } from "./utils";

export async function getRequiredData({ project, name }) {
  const [projectObject, functionObject, collectionsList] = await Promise.all([
    db("projects").select("*").where({ name: project }).first(),
    db("functions").select("code").where({ name, project }).first(),
    db("collections").select("name").where({ project }),
  ]);

  if (!projectObject) error("Project not found", 404);
  if (!functionObject) error("function not found");
  return {
    code: functionObject.code,
    env: projectObject.env,
    collectionsList: collectionsList.map((data) => data.name),
  };
}
