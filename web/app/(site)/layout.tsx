import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InjectAnalytics } from "@/components/InjectAnalytics";
import { getAnalyticsSettings } from "@/lib/siteSettings";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const analytics = await getAnalyticsSettings();

  return (
    <div className="flex min-h-full flex-col bg-zinc-50">
      <InjectAnalytics headHtml={analytics.head} bodyHtml={analytics.body} />
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
