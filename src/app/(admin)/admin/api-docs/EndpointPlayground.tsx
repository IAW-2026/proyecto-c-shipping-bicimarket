"use client";
import { useState } from "react";
import { Play, AlertCircle } from "lucide-react";
import type { EndpointSpec, HttpMethod } from "@/types/api-explorer";
import { useApiExplorer } from "@/hooks/querys/api-explorer/useApiExplorer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  POST: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  PATCH: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  PUT: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  DELETE: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function statusTone(status: number): string {
  if (status >= 200 && status < 300)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (status >= 400 && status < 500)
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
}

export function MethodChip({ method }: { method: HttpMethod }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-1.5 font-mono text-[11px] font-bold",
        METHOD_STYLES[method],
      )}
    >
      {method}
    </span>
  );
}

/**
 * Una tarjeta tipo Swagger para un endpoint: documentación (params, ejemplos,
 * errores) + un form "Try it" que ejecuta la llamada real vía el proxy
 * admin-only. El proxy inyecta el X-Service-Token del lado del servidor.
 */
export function EndpointPlayground({ spec }: { spec: EndpointSpec }) {
  const pathParams = spec.params.filter((p) => p.in === "path");
  const queryParams = spec.params.filter((p) => p.in === "query");
  const headerParams = spec.params.filter((p) => p.in === "header");

  const [pathVals, setPathVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(pathParams.map((p) => [p.name, p.example])),
  );
  const [queryVals, setQueryVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(queryParams.map((p) => [p.name, p.example])),
  );
  const [headerVals, setHeaderVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(headerParams.map((p) => [p.name, p.example])),
  );
  const [bodyText, setBodyText] = useState<string>(() =>
    spec.requestBody ? JSON.stringify(spec.requestBody, null, 2) : "",
  );
  const [bodyError, setBodyError] = useState<string | null>(null);

  const { mutate, data: result, isPending, reset } = useApiExplorer();

  function buildPath(): string {
    let path = spec.path;
    for (const p of pathParams) {
      path = path.replace(
        `{${p.name}}`,
        encodeURIComponent(pathVals[p.name] ?? ""),
      );
    }
    const qs = new URLSearchParams();
    for (const p of queryParams) {
      const v = queryVals[p.name]?.trim();
      if (v) qs.set(p.name, v);
    }
    const query = qs.toString();
    return query ? `${path}?${query}` : path;
  }

  function handleExecute() {
    setBodyError(null);
    reset();

    let parsedBody: unknown;
    if (spec.method !== "GET" && bodyText.trim()) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        setBodyError("El body no es JSON válido.");
        return;
      }
    }

    const headers: Record<string, string> = {};
    for (const p of headerParams) {
      const v = headerVals[p.name]?.trim();
      if (v) headers[p.name] = v;
    }

    mutate({
      method: spec.method,
      path: buildPath(),
      headers: Object.keys(headers).length ? headers : undefined,
      body: parsedBody,
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{spec.description}</p>

      {/* Meta: caller + auth */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span>
          <span className="font-semibold text-foreground">Lo llama:</span>{" "}
          <span className="text-muted-foreground">{spec.caller}</span>
        </span>
        <span>
          <span className="font-semibold text-foreground">Auth:</span>{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            {spec.auth}
          </code>
        </span>
      </div>

      {spec.notes && spec.notes.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          {spec.notes.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}

      <Separator />

      {/* ── Try it ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Play className="size-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Probar el endpoint
          </span>
        </div>

        {pathParams.length > 0 && (
          <ParamGroup title="Path params">
            {pathParams.map((p) => (
              <ParamRow key={p.name} label={p.name} required={p.required} hint={p.description}>
                <Input
                  value={pathVals[p.name] ?? ""}
                  onChange={(e) =>
                    setPathVals((s) => ({ ...s, [p.name]: e.target.value }))
                  }
                  className="font-mono text-xs"
                  placeholder={p.example}
                />
              </ParamRow>
            ))}
          </ParamGroup>
        )}

        {queryParams.length > 0 && (
          <ParamGroup title="Query params">
            {queryParams.map((p) => (
              <ParamRow key={p.name} label={p.name} required={p.required} hint={p.description}>
                <Input
                  value={queryVals[p.name] ?? ""}
                  onChange={(e) =>
                    setQueryVals((s) => ({ ...s, [p.name]: e.target.value }))
                  }
                  className="font-mono text-xs"
                  placeholder={p.example}
                />
              </ParamRow>
            ))}
          </ParamGroup>
        )}

        {headerParams.length > 0 && (
          <ParamGroup title="Headers">
            {headerParams.map((p) => (
              <ParamRow key={p.name} label={p.name} required={p.required} hint={p.description}>
                <Input
                  value={headerVals[p.name] ?? ""}
                  onChange={(e) =>
                    setHeaderVals((s) => ({ ...s, [p.name]: e.target.value }))
                  }
                  className="font-mono text-xs"
                  placeholder={p.example || "(opcional)"}
                />
              </ParamRow>
            ))}
          </ParamGroup>
        )}

        {spec.method !== "GET" && spec.requestBody != null && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Request body (JSON)</Label>
            <Textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              spellCheck={false}
              className="min-h-44 font-mono text-xs leading-relaxed"
            />
            {bodyError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5" /> {bodyError}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleExecute} disabled={isPending}>
            {isPending ? <Spinner /> : <Play className="size-3.5" />}
            Ejecutar
          </Button>
          <code className="truncate rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
            {spec.method} {buildPath()}
          </code>
        </div>
      </div>

      {/* ── Respuesta ──────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-bold",
                statusTone(result.status),
              )}
            >
              {result.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {result.duration_ms} ms
            </span>
          </div>
          <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
            {typeof result.body === "string"
              ? result.body
              : JSON.stringify(result.body, null, 2)}
          </pre>
        </div>
      )}

      {/* ── Doc: respuesta de ejemplo + errores ────────────────────────── */}
      <details className="group rounded-lg border border-border bg-card">
        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          Respuesta de ejemplo ({spec.responseStatus}) y errores
        </summary>
        <div className="space-y-3 border-t border-border px-3 py-3">
          <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
            {JSON.stringify(spec.responseExample, null, 2)}
          </pre>
          {spec.errors.length > 0 && (
            <div className="space-y-1.5">
              {spec.errors.map((e) => (
                <div
                  key={e.code}
                  className="grid grid-cols-[3rem_9rem_1fr] items-start gap-2 text-xs"
                >
                  <span className="font-mono font-semibold text-muted-foreground">
                    {e.status}
                  </span>
                  <code className="font-mono text-destructive">{e.code}</code>
                  <span className="text-muted-foreground">{e.when}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function ParamGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function ParamRow({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required: boolean;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:items-center sm:gap-3">
      <div className="space-y-0.5">
        <Label className="font-mono text-xs">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}
