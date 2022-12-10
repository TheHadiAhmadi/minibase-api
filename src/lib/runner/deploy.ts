import { getProject } from "$lib/server/services";
import shasum from "shasum";
import { getExpressCode } from "./get-express-code";
import { VERCEL_TOKEN } from "$env/static/private";
import { getPackageJSON } from "./get-data";
import { error } from "./utils";

type VercelFile = {
  file: string;
  sha: string;
  size: number;
};

async function uploadCodeToVercel(
  file: string,
  code: string
): Promise<VercelFile> {
  const sha = shasum(code);

  const response = await fetch("https://api.vercel.com/v2/files", {
    method: "POST",
    headers: {
      "x-vercel-digest": sha,
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "text/plain",
    },
    body: code,
  }).then((res) => res.json());

  return {
    file,
    sha,
    size: code.length,
  };
}

async function createDeployment({
  name,
  alias,
  files,
}: {
  name: string;
  alias: string[];
  files: VercelFile[];
}): any {
  const result = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      alias,
      files,
      builds: [
        {
          use: "@vercel/node",
          src: "index.js",
        },
      ],
      routes: [
        {
          src: "/(.*)",
          dest: "index.js",
        },
      ],
      projectSettings: {
        framework: null,
      },
      target: "production",
    }),
  }).then((res) => res.json());

  return result;
}

export async function deployProject(name: string) {
  const project = await getProject({ name });

  if (!project) error("project not found");

  const code = await getExpressCode(
    await project.collections,
    await project.functions
  );

  const result = await createDeployment({
    name: `minibase-project-${name}`,
    alias: [`minibase-project-${name}.vercel.app`],
    files: await Promise.all([
      uploadCodeToVercel("index.js", code),
      uploadCodeToVercel("package.json", getPackageJSON([])),
    ]),
  });

  console.log(result);

  return {
    urls: [...result.alias, result.url],
  };
}
