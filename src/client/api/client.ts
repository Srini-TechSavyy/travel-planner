export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const data = (await parseJson<{ error?: string }>(res)) as {
        error?: string;
      };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return {} as T;
  return parseJson<T>(res);
}
