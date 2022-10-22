import { VM } from "vm2";
import { error } from "./utils";

export async function runJS(request, js = "", env = {}, db = {}, utils = {}) {
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

    const output = await vm.run(input).catch((err) => {
      throw err;
    });

    if (output instanceof Response) {
      return output;
    } else {
      if (typeof output === "object") {
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
  } catch (err) {
    const codeline = err.stack.split(":")[1].split("\n")[0];
    console.log(codeline);
    error("js:" + codeline + " - " + err.message, 500, err.stack);
  }
}
