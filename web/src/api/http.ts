const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

function makeUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  query?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  const requestUrl = makeUrl(path, query);
  const bodyIsFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      ...(bodyIsFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  const textPayload = await response.text();
  const parsedPayload = textPayload ? JSON.parse(textPayload) : null;

  if (!response.ok) {
    const detail =
      parsedPayload?.detail ||
      parsedPayload?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, detail);
  }

  return parsedPayload as T;
}
