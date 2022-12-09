import db from "$lib/server/db";
import { error } from "./utils";

export async function getRequiredData({ project, name }) {
  console.time("getRequiredData");
  const [projectObject, functionObject, collectionsList] = await Promise.all([
    db("projects").select("*").where({ name: project }).first(),
    db("functions").select("code").where({ project, name }).first(),
    db("collections").select("name").where({ project }),
  ]);

  if (!projectObject) error("Project not found", 404);
  if (!functionObject) error("function not found", 404);

  console.timeEnd("getRequiredData");
  return {
    code: functionObject.code,
    env: JSON.parse(projectObject.env),
    collectionsList: collectionsList.map((data) => data.name),
  };
}

async function projectsList() {
  const prjs = await db.select("name").from("projects");

  const projects = prjs
    .map((prj) => `<li><a href="/${prj.name}">${prj.name}</li>`)
    .join("");

  return new Response(`<ul>${projects}</ul>`, {
    headers: { "Content-Type": "text/html" },
  });
}
import type { ProjectFunction } from "$lib/types";

import { getFunctions } from "$lib/server/services";

let functionTemplate = `/* DO NOT EDIT MANUALLY, 
THIS FILE IS AVAILABLE AT https://theminibase.com/%%name%%/%%file%%.js */  

const minibase = (appName) => {
  let token = "";

  async function run(functionName, data = {}) {
      const baseUrl = "https://minibase-api.onrender.com/" + appName + '/';
      const opts = {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              Authorization: "bearer " + token,
          },
          body: JSON.stringify(data),
      };

      const res = await fetch(baseUrl + functionName, opts);
      const result = await res.json();

      if (result.error) {
          console.log(result.error)
          throw new Error(result.error.message);
      }

      return result.data;
  }

  return {
      setToken(value) {
          token = value;
      },
      getToken() {
          return token;
      },
      %%functions%%
  };
};

`;

export async function getClientSideCode(
  project: string,
  type: "module" | "cdn" = "module"
) {
  const fns = await getFunctions({ project });

  const functions = fns
    .map(
      (fn: ProjectFunction) => `${fn.name}: (data) => run("${fn.name}", data)`
    )
    .join(",\n      ");

  let result = functionTemplate.replace("%%functions%%", functions);
  result = result.replace("%%name%%", project);
  result = result.replace("%%file%%", type === "module" ? "mod" : "cdn");

  if (type === "module") {
    result += `\nexport default minibase("${project}");`;
  } else {
    result = `(function() {\n${result}\nif(window){window['${project}']=minibase("${project}")}})()`;
  }
  return result;
}
