import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import { SidebarNavigation } from "@/components/layout/SidebarNavigation";
import { SystemSettings } from "@/components/ui/SystemSettings";
import { getIndustrialSession } from "@/lib/session";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const session = await getIndustrialSession();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <SidebarNavigation session={session} />
      
      {/* ⚙️ Floating System Settings Trigger (Top-Right) */}
      <div className="fixed top-6 right-6 z-40">
        <SystemSettings />
      </div>

      {children}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton 
      />
    </NextIntlClientProvider>
  );
}
