import { VM } from "vm2";
import db from "../../lib/db";

async function runJS(request, js, env, db) {
  const input =
    "exports = {}\n" +
    js +
    `;
  
  try {
    const method = __request.method
    if(exports[method]) {
      exports[method](__request)
    } else {
      new Response("Method not allowed", {status: 405})
    }
  } catch(err){
    console.log(err)
    new Response("Error while running code: " + err.message, {status: 500})
  }

  `;

  const project = {
    env,
    db,
    utils: {},
  };

  const vm = new VM({ timeout: 2000 });

  vm.freeze(request, "__request");
  vm.freeze(fetch, "fetch");
  vm.freeze(Headers, "Headers");
  vm.freeze(URL, "URL");
  vm.freeze(crypto, "crypto");
  vm.freeze(Response, "Response");
  vm.freeze(project, "project"); // utils

  const output = await vm.run(input);

  if (output instanceof Response) {
    return output;
  } else if (typeof output === "object") {
    const headers = output.headers ?? {};
    const status = output.status ?? 200;
    const body = output.body;

    const bodyInit = typeof body === "object" ? JSON.stringify(body) : body;

    return new Response(bodyInit, {
      status,
      headers,
    });
  } else if (typeof output === "string" || typeof output === "number") {
    return new Response(output.toString(), { status: 200 });
  } else {
    console.log("no return");
    return new Response();
  }
}

function error(message, status) {
  throw new Error(JSON.stringify({ message, status }));
}

function respond(body, status) {
  return new Response(JSON.stringify(body), { status });
}

async function getFunction({ project, name }) {
  const [projectObject, functionObject, collectionsList] = await Promise.all([
    db("projects").select("*").where({ name: project }).first(),
    db("functions").select("code").where({ name, project }).first(),
    db("collections").select("name").where({ project }),
  ]);

  if (!projectObject) error("Project not found", 404);
  if (!functionObject) error("function not found");
  return {
    code: functionObject.code,
    env: projectObject.env ?? { TODO: "true" },
    collectionsList,
  };
}

function createDB(project, collection) {
  return {
    async insert(data) {
      const id = crypto.randomUUID();
      await db("rows").insert({
        id,
        project,
        collection,
        data: JSON.stringify(data),
      });
      return { ...data, id };
    },
    async remove(id) {
      await db("rows").delete().where({ project, collection, id });
      return true;
    },
    async update(id, data) {
      await db("rows").update({ data }).where({ id, project, collection });
      return { ...data, id };
    },
    async get(id) {
      const result = await db("rows")
        .select("data", "id")
        .where({ project, collection, id })
        .first();

      if (!result) return null;

      return { ...result.data, id: result.id };
    },
    async find(filter = {}, options = {}) {
      let result = await db("rows")
        .select("data", "id")
        .where({ project, collection });
      const take = options.take ?? -1;
      const skip = options.skip ?? 0;

      result = result
        .map((res) => ({ ...res.data, id: res.id }))
        .filter((data) => {
          Object.entries(filter).map(([key, value]) => {
            if (data[key] !== value) {
              return false;
            }
          });
          return true;
        });
      if (take === -1) return result.slice(skip);
      if (take > result.length) return result.slice(skip);

      return result.slice(skip, skip + take);
    },
  };
}

async function handle({ params, locals, request }) {
  const project = locals.project;
  const name = params.name;

  try {
    if (!project) error("Project not found", 404);

    const {
      code,
      env,
      collectionsList,
    } = await getFunction({ project, name });

    const collections = collectionsList.reduce((prev, collection) => {
      prev[collection.name] = createDB(project, collection.name);
      return prev;
    }, {});

    try {
      const result = await runJS(request, code, env, collections);

      return result;
    } catch (err) {
      error("JS Error: " + err.message, 400);
    }
  } catch (err) {
    const er = JSON.parse(err.message);
    return respond({ message: er.message, status: er.status }, er.status);
  }
}

export { handle as GET };
export { handle as POST };
export { handle as PUT };
export { handle as DELETE };
