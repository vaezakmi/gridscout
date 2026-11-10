export type AppError = { tag: "app_error"; status: number; message: string };

function appError(status: number, message: string): AppError {
  return { tag: "app_error", status, message };
}

export const Errors = {
  badRequest: (msg: string) => appError(400, msg),
  unauthorized: (msg: string) => appError(401, msg),
  forbidden: (msg: string) => appError(403, msg),
  notFound: (msg: string) => appError(404, msg),
  internal: (msg: string) => appError(500, msg),
} as const;

export function isAppError(e: unknown): e is AppError {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as any).tag === "app_error" &&
    typeof (e as any).status === "number" &&
    typeof (e as any).message === "string"
  );
}