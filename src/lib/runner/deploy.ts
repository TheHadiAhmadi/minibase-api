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
  code: string,
  vercel_token: string
): Promise<VercelFile> {
  const sha = shasum(code);

  const response = await fetch("https://api.vercel.com/v2/files", {
    method: "POST",
    headers: {
      "x-vercel-digest": sha,
      Authorization: `Bearer ${vercel_token ?? VERCEL_TOKEN}`,
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
  vercel_token,
}: {
  name: string;
  alias: string[];
  files: VercelFile[];
  vercel_token?: string;
}): any {
  const result = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vercel_token ?? VERCEL_TOKEN}`,
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
      rewrites: [{ source: "/(.*)", destination: "/" }],

      headers: [
        {
          source: "/(.*)",
          headers: [
            { key: "Access-Control-Allow-Credentials", value: "true" },
            { key: "Access-Control-Allow-Origin", value: "*" },
            {
              key: "Access-Control-Allow-Methods",
              value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
            },
            {
              key: "Access-Control-Allow-Headers",
              value:
                "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
            },
          ],
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

export async function deployProject({
  name,
  url,
  database_uri,
  database_client,
  vercel_token,
}: Record<string, string>) {
  const project = await getProject({ name });

  console.log(project);
  if (!project) error("project not found", 404);

  let default_packages = [
    "express",
    "knex",
    "crypto",
    "jsonwebtoken",
    "bcrypt",
    "cors",
    database_client ?? "sqlite3",
  ];
  const collections = await project.collections;
  const functions = await project.functions;

  let code;
  console.log({ collections, functions });
  try {
    code = await getExpressCode(
      await project.collections,
      await project.functions,
      {
        database_client,
        database_uri,
        packages: default_packages,
        env: project.env
      }
    );
  } catch (err) {
    console.log(err);
  }

  try {
    console.log({ code });
    const result = await createDeployment({
      name: `minibase-project-${name}`,
      alias: [url ?? `minibase-project-${name}.vercel.app`],
      vercel_token,
      files: await Promise.all([
        uploadCodeToVercel("index.js", code, vercel_token),
        uploadCodeToVercel(
          "package.json",
          getPackageJSON(default_packages),
          vercel_token
        ),
      ]),
    });

    console.log(result);

    return {
      urls: [...result.alias, result.url],
    };
  } catch (err) {
    console.log(err);
  }
}
