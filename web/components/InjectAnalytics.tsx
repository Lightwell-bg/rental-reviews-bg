"use client";

import { useEffect } from "react";

type InjectAnalyticsProps = {
  headHtml: string;
  bodyHtml: string;
};

function injectHtml(target: HTMLElement, html: string, markerId: string) {
  const trimmed = html.trim();
  if (!trimmed) return;

  target
    .querySelectorAll(`[data-inject-marker="${markerId}"]`)
    .forEach((el) => el.remove());

  const template = document.createElement("template");
  template.innerHTML = trimmed;

  Array.from(template.content.childNodes).forEach((node) => {
    if (node.nodeName === "SCRIPT") {
      const oldScript = node as HTMLScriptElement;
      const script = document.createElement("script");
      script.setAttribute("data-inject-marker", markerId);
      for (const attr of oldScript.attributes) {
        script.setAttribute(attr.name, attr.value);
      }
      script.text = oldScript.textContent ?? "";
      target.appendChild(script);
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node.cloneNode(true) as Element;
      el.setAttribute("data-inject-marker", markerId);
      target.appendChild(el);
    }
  });
}

export function InjectAnalytics({ headHtml, bodyHtml }: InjectAnalyticsProps) {
  useEffect(() => {
    injectHtml(document.head, headHtml, "site-analytics-head");
  }, [headHtml]);

  useEffect(() => {
    injectHtml(document.body, bodyHtml, "site-analytics-body");
  }, [bodyHtml]);

  return null;
}
