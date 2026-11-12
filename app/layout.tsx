import type { Metadata } from "next";
import "./globals.css";
import Pwa from "./pwa";

export const metadata: Metadata = {
  title: "CISC SchedFlow",
  description: "Explore rooms and published class schedules.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Pwa />
        {children}
      </body>
    </html>
  );
}
