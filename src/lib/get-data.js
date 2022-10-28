import db from "./db";
import { error } from "./utils";

export async function getRequiredData({ project, name }) {
  console.time("getRequiredData");
  const [projectObject, functionObject, collectionsList] = await Promise.all([
    db("projects").select("*").where({ name: project }).first(),
    db("functions").select("code").where({ project, name }).first(),
    db("collections").select("name").where({ project }),
  ]);

  if (!projectObject) error("Project not found", 404);
  if (!functionObject) error("function not found");

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

let functionTemplate = `/* DO NOT EDIT MANUALLY, 
THIS FILE IS AVAILABLE AT https://%%name1%%.theminibase.com/mod.js */  

const minibase = (appName) => {
  let token = "";

  async function run(functionName, data = {}) {
      const baseUrl = "https://" + appName + ".theminibase.com/";
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

      if (result.error) throw new Error(result.error);

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

export default minibase("%%name2%%");
`;

export async function functionsList(project) {
  console.log({ project });
  if (!project) {
    return projectsList();
  }

  const fns = await db.select("name").from("functions").where({ project });

  const functions = fns
    .map((fn) => `      ${fn.name}: (data) => run("${fn.name}", data)`)
    .join(",\n");

  console.log(functions);

  let result = functionTemplate.replace("%%functions%%", functions);
  result = result.replace("%%name1%%", project);
  result = result.replace("%%name2%%", project);

  return new Response(result, {
    headers: { "Content-Type": "text/plain" },
  });
}
