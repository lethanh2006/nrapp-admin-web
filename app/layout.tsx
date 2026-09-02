import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HDG WorkSpace · Quản trị",
    template: "%s · HDG WorkSpace",
  },
  description: "Trung tâm quản trị vận hành nội bộ HDG WorkSpace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
