export type AnalyticsPart =
  | {
      type: "inline-script";
      content: string;
    }
  | {
      type: "external-script";
      src: string;
      async: boolean;
      defer: boolean;
    }
  | {
      type: "noscript";
      html: string;
    }
  | {
      type: "meta";
      name?: string;
      property?: string;
      content: string;
      httpEquiv?: string;
    };

function readAttr(attrs: string, name: string): string | undefined {
  const match = attrs.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i")
  );
  return match?.[1] ?? match?.[2];
}

export function parseAnalyticsHtml(html: string): AnalyticsPart[] {
  const trimmed = html.trim();
  if (!trimmed) return [];

  const parts: AnalyticsPart[] = [];
  const withoutComments = trimmed.replace(/<!--[\s\S]*?-->/g, "");

  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptRegex.exec(withoutComments)) !== null) {
    const attrs = scriptMatch[1] ?? "";
    const content = scriptMatch[2] ?? "";
    const src = readAttr(attrs, "src");

    if (src) {
      parts.push({
        type: "external-script",
        src,
        async: /\basync\b/i.test(attrs),
        defer: /\bdefer\b/i.test(attrs),
      });
    } else if (content.trim()) {
      parts.push({ type: "inline-script", content: content.trim() });
    }
  }

  const noscriptRegex = /<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gi;
  let noscriptMatch: RegExpExecArray | null;
  while ((noscriptMatch = noscriptRegex.exec(withoutComments)) !== null) {
    const inner = noscriptMatch[1]?.trim();
    if (inner) {
      parts.push({ type: "noscript", html: inner });
    }
  }

  const metaRegex = /<meta\b([^>]*?)\/?>/gi;
  let metaMatch: RegExpExecArray | null;
  while ((metaMatch = metaRegex.exec(withoutComments)) !== null) {
    const attrs = metaMatch[1] ?? "";
    const content = readAttr(attrs, "content");
    if (!content) continue;

    parts.push({
      type: "meta",
      name: readAttr(attrs, "name"),
      property: readAttr(attrs, "property"),
      httpEquiv: readAttr(attrs, "http-equiv"),
      content,
    });
  }

  return parts;
}

export function mergeAnalyticsHtml(headHtml: string, bodyHtml: string): string {
  return [headHtml, bodyHtml].filter(Boolean).join("\n");
}
