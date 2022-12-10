import { VM } from "vm2";
import { error } from "./utils";
import * as jsonwebtoken from "jsonwebtoken";
import * as bcrypt from "bcrypt";

export async function runJS(
  request: Request,
  js = "",
  env: any = {},
  db: any = {},
  utils: any = {}
) {
  console.time("runJS");
  try {
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

    const body = await request.json();

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
    vm.freeze(bcrypt, "bcrypt"),
      vm.freeze(jsonwebtoken.default, "jsonwebtoken");

    const output = await vm.run(input);

    console.log(output);
    if (output instanceof Response) {
      console.timeEnd("runJS");
      return output;
    }
  } catch (err: any) {
    console.log("finish user code with error");
    const codeline = err.stack.split(":")[1].split("\n")[0];
    console.log(codeline);
    console.timeEnd("runJS");
    error("js:" + codeline + " - " + err.message, 500, err.stack);
  }
}
