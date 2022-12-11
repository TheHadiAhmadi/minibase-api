import { json } from "@sveltejs/kit";
import type { Handle, HandleServerError } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  if (event.request.method === "OPTIONS") {
    const response = new Response(undefined, {
      status: 200,
    });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "*");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization,Content-Type,ApiKey"
    );
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    return response;
  }

  const apiKey = event.request.headers.get("ApiKey") ?? "";
  event.locals.apiKey = apiKey;

  try {
    console.log("before handle", event);
    const response: Response = await resolve(event);

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "*");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization,content-type,ApiKey"
    );
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    return response;
  } catch (err) {
    console.log(err);
    return new Response("hi");
  }
};

export const handleError: HandleServerError = ({
  error,
  event,
}: {
  error: any;
  event: any;
}) => {
  return {
    message: "error",
    status: 123,
  };
  // return {
  //   message: error?.message,
  //   status: error?.status ?? "UNKNOWN",
  // };
};
