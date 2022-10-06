import { VM } from "vm2";
import db from "../../../lib/db";

// import { VM } from "vm2";
// import { getCode } from "$services";
// import type { RequestEvent } from "./$types";

// type Data = Record<string, any>;
// type DataResult = {id: string, value: Data}

// type Collection = {
//   insert: (data: Data) => DataResult;
//   remove: (id: string) => boolean;
//   update: (id: string, data: Data) => DataResult;
//   get: (id: string) => DataResult;
//   find: (filter: Data, options: {skip?: number, take?: number}) => DataResult[]
// }

// async function handle({ request, params }: RequestEvent) {
//   const id = params.id;
//   console.log("New Request -------------- " + id);

//   const { code } = await getCode({ name: id });

//   if (!code) {
//     return new Response(
//       JSON.stringify({ message: "Function doesn't exists" }),
//       { status: 404 }
//     );
//   }

//   const input = code + "\nhandle(__request);";

//   try {
//     const vm = new VM({ timeout: 5000 });
//     vm.freeze(request, "__request");
//     vm.freeze(fetch, 'fetch')
//     vm.freeze(Headers, 'Headers')
//     vm.freeze(Response, 'Response')
//     vm.freeze(DB, 'DB')

//     const output = await vm.run(input);
//     console.log(output);

//     if (output instanceof Response) {
//       return output;
//     } else if (typeof output === "object") {
//       const headers = output.headers ?? {};
//       const status = output.status ?? 200;
//       const body = output.body;

//       const bodyInit = typeof body === "object" ? JSON.stringify(body) : body;

//       return new Response(bodyInit, {
//         status,
//         headers,
//       });
//     } else if (typeof output === "string" || typeof output === "number") {
//       return new Response(output.toString(), { status: 200 });
//     }
//   } catch (err) {
//     console.log(err);
//     return new Response("Internal Server Error", { status: 500 });
//     // res.status(500).send("internal server error");
//   }
// }

async function runJS(request, js, DB) {
  const input = js + "\nhandle(__request);";

  const vm = new VM({ timeout: 5000 });
  vm.freeze(request, "__request");
  vm.freeze(fetch, "fetch");
  vm.freeze(Headers, "Headers");
  vm.freeze(Response, "Response");
  vm.freeze(DB, "DB");

  const output = await vm.run(input);
  console.log(output);

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
  }
}

function error(message, status) {
  throw new Error(JSON.stringify({ message, status }));
}

function respond(body, status) {
  return new Response(JSON.stringify(body), { status });
}

async function getFunction({ project, name, apiKey }) {
  console.log("HERE6");
  const [projectObject, functionObject] = await Promise.all([
    db("projects").select("apiKey").where({ name: project }).first(),
    db("functions").select("code").where({ name, project }).first(),
  ]);
  console.log("HERE55");

  if (!projectObject) error("Project not found", 404);

  console.log({ projectObject, apiKey, functionObject });
  console.log("HERE7");
  if (!projectObject?.apiKey || projectObject?.apiKey !== apiKey) {
    console.log("HERE8");
    error("ApiKey doesn't match", 401);
  }

  if (!functionObject) error("function not found");

  console.log("HERE 9");
  return functionObject.code;
}

function createDB(project) {
  return (collection) => {
    // let _data = []
    return {
      insert(data) {
        return db("rows").insert({
          id: crypto.randomUUID(),
          project,
          collection,
          data: JSON.stringify(data),
        });

        // const value = {value: data, id: crypto.randomUUID()}
        // _data.push(value)
        // return value
      },
      remove(id) {
        return db("rows").delete().where({ project, collection, id });
        // _data = _data.filter(data => data.id !== id)
        // return true
      },
      update(id, data) {
        return db("rows").update({ data }).where({ id, project, collection });
        // _data = _data.map(d => {
        //   if(d.id == id) return data;
        //   return d
        // })
        // return {id, value: data}
      },
      async get(id) {
        const result = await db("rows")
          .select("data", "id")
          .where({ project, collection, id })
          .first();

        return {
          ...result.data,
          id,
        };
        // return _data.find(data => data.id === id)
      },
      async find(filter = {}, options = {}) {
        let result = await db("rows")
          .select("data", "id")
          .where({ project, options });
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
  };
}

async function handle({ params, locals, request }) {
  // get function from db

  const apiKey = (await request.headers.get("ApiKey")) ?? "";
  const project = locals.project;
  const name = params.name;

  // console.log("HERE1");
  try {
    if (!apiKey)
      throw new ResponseError(
        "You should set ApiKey header to project's apiKey",
        401
      );

    // console.log("HERE2");
    if (!project) throw new ResponseError("Project not found", 404);

    // console.log("HERE3");
    const code = await getFunction({ project, name, apiKey });
    console.log("CODE", code);

    const result = await runJS(request, code, createDB(project));
    console.log(result);
    return result;
  } catch (err) {
    // console.log("HERE5");
    // console.log(err);
    const er = JSON.parse(err.message);
    return respond({ message: er.message }, er.status);
  }
}
export { handle as GET };
export { handle as POST };
export { handle as PUT };
export { handle as DELETE };
