import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { AccountProvider } from "@/components/account/AccountProvider";
import { ActivityProvider } from "@/components/activity-log/ActivityProvider";
import { DraftOrderProvider } from "@/components/draft-order/DraftOrderProvider";
import { AppSidebar } from "@/components/app-sidebar";
import { ActivitySidebar } from "@/components/activity-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// fonts — DM Sans for body, Outfit for headings
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// meta data
export const metadata: Metadata = {
  title: "Apollo | by Gravity",
  description: "ERP Tool",
};

// children is marked 'Readonly' as a safety habit. layout should never reassign children only render it
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${outfit.variable} h-full antialiased`}
    >
      <body>
        <AccountProvider>
          <ActivityProvider>
            <DraftOrderProvider>
              <SidebarProvider
                style={
                  {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                  } as React.CSSProperties
                }
              >
                <AppSidebar variant="inset" />
                <SidebarInset>
                  <SiteHeader />
                  <main className="flex-1">{children}</main>
                </SidebarInset>
                <ActivitySidebar />
              </SidebarProvider>
            </DraftOrderProvider>
          </ActivityProvider>
        </AccountProvider>
      </body>
    </html>
  );
}
