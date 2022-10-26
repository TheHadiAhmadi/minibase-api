import { VM } from "vm2";
import { error } from "./utils";
import * as jsonwebtoken from "jsonwebtoken";

export async function runJS(request, js = "", env = {}, db = {}, utils = {}) {
  console.time("runJS");
  try {
    const input = `
    let exports = () => ({
      error: {
        message: 'Function not found', 
        code: 'NOT_FOUND'
      }
    })

    ${js};

      exports(body, ctx).then(result => {
        return new Response(JSON.stringify(result), {status: 200})
      }).catch(err => {
      console.log(err)
      return new Response("Error while running code: " + err.message, {status: 500})
    })
  `;


    const vm = new VM({ timeout: 2000 });

    const body = await request.json();

    const ctx = {
      token: (request.headers.get('Authorization') ?? '')[1] ?? '',
      url: request.url,
      db,
      env,
      utils,
      packages: {
        jsonwebtoken: jsonwebtoken.default
      }
    }

    // vm.freeze(request, "__request");
    vm.freeze(fetch, "fetch");
    vm.freeze(Headers, "Headers");
    vm.freeze(URL, "URL");
    vm.freeze(crypto, "crypto");
    vm.freeze(Response, "Response");
    vm.freeze(body, "body");
    vm.freeze(ctx, "ctx")

    const output = await vm.run(input);

    console.log(output);
    if (output instanceof Response) {
      console.timeEnd("runJS");
      return output;
    }
  } catch (err) {
    console.log("finish user code with error");
    const codeline = err.stack.split(":")[1].split("\n")[0];
    console.log(codeline);
    console.timeEnd("runJS");
    error("js:" + codeline + " - " + err.message, 500, err.stack);
  }
}
