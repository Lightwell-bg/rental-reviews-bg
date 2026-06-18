export const GOOGLE_VERIFICATION_FILENAME_KEY = "google_site_verification_filename";
export const GOOGLE_VERIFICATION_CONTENT_KEY = "google_site_verification_content";

export const GOOGLE_VERIFICATION_KEYS = [
  GOOGLE_VERIFICATION_FILENAME_KEY,
  GOOGLE_VERIFICATION_CONTENT_KEY,
] as const;

/** Имя файла, которое выдаёт Google Search Console. */
export const GOOGLE_VERIFICATION_FILENAME_PATTERN =
  /^google[a-zA-Z0-9_-]+\.html$/;

export type GoogleVerificationSettings = {
  filename: string;
  content: string;
};

export function isGoogleVerificationFilename(filename: string): boolean {
  return GOOGLE_VERIFICATION_FILENAME_PATTERN.test(filename);
}

export function buildDefaultVerificationContent(filename: string): string {
  return `google-site-verification: ${filename.trim()}`;
}

export function normalizeVerificationFilename(raw: string): string {
  return raw.trim().replace(/^\//, "");
}
