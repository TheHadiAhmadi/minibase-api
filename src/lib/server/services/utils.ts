import { json } from "@sveltejs/kit";

export class ResponseError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ResponseError";
    this.status = status ?? 500;
  }
}

export function respondError(error: ResponseError | Error) {
  if (error instanceof ResponseError)
    return new Response(
      JSON.stringify({
        status: error.status,
        message: error.message ?? "Internal Server Error",
      }),
      { status: error.status ?? 500 }
    );

  return new Response(
    JSON.stringify({
      status: 500,
      message: error.message ?? "Internal Server Error",
    }),
    { status: 500 }
  );
}

export function respond(body: {
  data: any;
  status?: number;
  headers?: HeadersInit;
}) {
  const status = body.status ?? 200;
  const headers = body.headers ?? {};
  const data = body.data ?? {};

  return json({ data, status }, { status, headers });
}
