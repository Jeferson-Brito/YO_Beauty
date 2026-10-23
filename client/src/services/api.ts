export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type ErrorBody = { error?: string; issues?: { message: string }[] };

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as ErrorBody | null;
  if (!response.ok) {
    throw new ApiError(response.status, body?.issues?.[0]?.message || body?.error || 'Não foi possível concluir a operação.');
  }
  return body as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'include' });
  return parse<T>(response);
}

export async function apiSend<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parse<T>(response);
}

export async function apiUpload<T>(path: string, file: File, fields?: Record<string, string>): Promise<T> {
  const body = new FormData();
  body.append('file', file);
  for (const [key, value] of Object.entries(fields ?? {})) body.append(key, value);
  const response = await fetch(path, { method: 'POST', credentials: 'include', body });
  return parse<T>(response);
}
