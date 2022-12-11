import { VM } from "vm2";
import { error } from "./utils";
import * as jsonwebtoken from "jsonwebtoken";
import * as bcrypt from "bcrypt";

export async function runJS(
  request: Request,
  method: string = "POST",
  js = "",
  env: any = {},
  db: any = {},
  utils: any = {}
) {
  console.time("runJS");

  const input = `
    let handle = () => ({
      error: {
        message: 'Function not found', 
        code: 'NOT_FOUND'
      }
    })

    ${js};

      handle(body, ctx).then(result => {
        return new Response(JSON.stringify(result), {status: 200})
      }).catch(err => {
      console.log(err)
      return new Response("Error while running code: " + err.message, {status: 500})
    })
  `;

  const vm = new VM({ timeout: 2000 });

  if (method !== request.method) {
    error("method not available", 405);
  }

  let body;
  if (method === "GET") {
    const url = new URL(request.url);
    const qs: Record<string, string | number | boolean> = {};
    for (const p of url.searchParams) {
      const n = p[0];
      const v = p[1];
      if (v === "") qs[n] = true;
      else if (v === "true") qs[n] = true;
      else if (v === "false") qs[n] = false;
      else if (!isNaN(Number(v))) qs[n] = +v;
      else qs[n] = v;
    }
    body = qs;
  } else {
    try {
      body = await request.json();
    } catch (err) {
      body = {};
    }
  }

  const ctx = {
    token: (request.headers.get("Authorization") ?? "").split(" ")[1] ?? "",
    url: request.url,
    db,
    env,
    utils,
  };

  // vm.freeze(request, "__request");
  vm.freeze(fetch, "fetch");
  vm.freeze(Headers, "Headers");
  vm.freeze(URL, "URL");
  vm.freeze(FormData, "FormData");
  vm.freeze(crypto, "crypto");
  vm.freeze(Response, "Response");
  vm.freeze(body, "body");
  vm.freeze(ctx, "ctx");
  vm.freeze(bcrypt, "bcrypt"), vm.freeze(jsonwebtoken.default, "jsonwebtoken");
  let output;

  try {
    output = await vm.run(input);
  } catch (err: any) {
    console.log("finish user code with error");
    const codeline = err.stack.split(":")[1].split("\n")[0];
    console.log(codeline);
    console.timeEnd("runJS");
    error("js:" + codeline + " - " + err.message, 500, err.stack);
  }
  console.log(output);
  if (output instanceof Response) {
    console.timeEnd("runJS");
    return output;
  }
}
