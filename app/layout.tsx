import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "./globals.css";
import SmoothScroll from "./smooth-scroll";
import Pwa from "./pwa";

export const metadata: Metadata = {
  title: "CISC SchedFlow",
  description: "Explore rooms and published class schedules.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll />
        <Pwa />
        {children}
      </body>
    </html>
  );
}
