import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
