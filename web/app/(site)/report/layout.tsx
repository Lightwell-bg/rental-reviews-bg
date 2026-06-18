import { toPageMetadata } from "@/lib/pageSeo";
import { getPageSeoSettings } from "@/lib/siteSettings";

export async function generateMetadata() {
  const settings = await getPageSeoSettings();
  return toPageMetadata("report", settings);
}

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
