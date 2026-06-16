import {
  parseAnalyticsHtml,
  type AnalyticsPart,
} from "@/lib/parseAnalyticsHtml";

function renderPart(part: AnalyticsPart, index: number) {
  switch (part.type) {
    case "inline-script":
      return (
        <script
          key={`script-inline-${index}`}
          dangerouslySetInnerHTML={{ __html: part.content }}
        />
      );
    case "external-script":
      return (
        <script
          key={`script-src-${index}`}
          src={part.src}
          async={part.async || undefined}
          defer={part.defer || undefined}
        />
      );
    case "noscript":
      return (
        <noscript
          key={`noscript-${index}`}
          dangerouslySetInnerHTML={{ __html: part.html }}
        />
      );
    case "meta":
      return (
        <meta
          key={`meta-${index}`}
          name={part.name}
          property={part.property}
          httpEquiv={part.httpEquiv}
          content={part.content}
        />
      );
    default:
      return null;
  }
}

export function AnalyticsHeadScripts({ html }: { html: string }) {
  const parts = parseAnalyticsHtml(html);
  if (parts.length === 0) return null;

  return <>{parts.map(renderPart)}</>;
}

export function AnalyticsBodyScripts({ html }: { html: string }) {
  const parts = parseAnalyticsHtml(html);
  if (parts.length === 0) return null;

  return <>{parts.map(renderPart)}</>;
}
