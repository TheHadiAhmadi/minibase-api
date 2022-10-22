import { VM } from "vm2";
import { error } from "./utils";
import * as jsonwebtoken from "jsonwebtoken";


export async function runJS(request, js = "", env = {}, db = {}, utils = {}) {
  console.time("runJS");
try {
    const input = `
    exports = {}
    ${js};

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

    const vm = new VM({ timeout: 2000 });

    vm.freeze(request, "__request");
    vm.freeze(fetch, "fetch");
    vm.freeze(Headers, "Headers");
    vm.freeze(URL, "URL");
    vm.freeze(crypto, "crypto");
    vm.freeze(Response, "Response");
    vm.freeze({ env, db, utils }, "project");
    vm.freeze(jsonwebtoken, "jsonwebtoken");

    console.log("running user code");
    const output = await vm.run(input);
    console.log("finish user code");

    if (output instanceof Response) {
      console.timeEnd("runJS");
      return output;
    } else {
      if (typeof output === "object") {
        const headers = output.headers ?? {};
        const status = output.status ?? 200;
        const body = output.body;

        const bodyInit = typeof body === "object" ? JSON.stringify(body) : body;

        console.timeEnd("runJS");
        return new Response(bodyInit, {
          status,
          headers,
        });
      } else if (typeof output === "string" || typeof output === "number") {
        console.timeEnd("runJS");
        return new Response(output.toString(), { status: 200 });
      } else {
        console.log("no return");
        console.timeEnd("runJS");
        return new Response();
      }
    }
  } catch (err) {
    console.log("finish user code with error");
    const codeline = err.stack.split(":")[1].split("\n")[0];
    console.log(codeline);
    console.timeEnd("runJS");
    error("js:" + codeline + " - " + err.message, 500, err.stack);
  }
}
