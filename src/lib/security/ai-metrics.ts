type MetricName =
  | 'requests_total'
  | 'auth_denied'
  | 'role_denied'
  | 'rate_limited'
  | 'openai_success'
  | 'openai_error'
  | 'openai_timeout'
  | 'server_error';

const counters = new Map<string, number>();

function makeKey(route: string, metric: MetricName): string {
  return `${route}:${metric}`;
}

export function recordAiMetric(route: string, metric: MetricName): void {
  const key = makeKey(route, metric);
  counters.set(key, (counters.get(key) ?? 0) + 1);
}

export function readAiMetricsSnapshot(route: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of counters.entries()) {
    if (!key.startsWith(`${route}:`)) continue;
    out[key.slice(route.length + 1)] = value;
  }
  return out;
}
