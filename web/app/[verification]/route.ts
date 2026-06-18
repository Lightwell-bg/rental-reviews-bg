import { notFound } from "next/navigation";

import { isGoogleVerificationFilename } from "@/lib/googleVerification";
import { getGoogleVerificationSettings } from "@/lib/siteSettings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ verification: string }> }
) {
  const { verification } = await params;

  if (!isGoogleVerificationFilename(verification)) {
    notFound();
  }

  const settings = await getGoogleVerificationSettings();
  const filename = settings.filename.trim();
  const content = settings.content.trim();

  if (!filename || !content || verification !== filename) {
    notFound();
  }

  return new Response(content, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
