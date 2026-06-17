import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AnalyticsBodyScripts } from "@/components/AnalyticsScripts";
import { getAnalyticsSettings } from "@/lib/siteSettings";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const analytics = await getAnalyticsSettings();

  return (
    <div className="flex min-h-full flex-col bg-surface">
      <AnalyticsBodyScripts html={analytics.body} />
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
