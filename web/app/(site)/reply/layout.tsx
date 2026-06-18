import { toPageMetadata } from "@/lib/pageSeo";
import { getPageSeoSettings } from "@/lib/siteSettings";

export async function generateMetadata() {
  const settings = await getPageSeoSettings();
  return toPageMetadata("reply", settings);
}

export default function ReplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
