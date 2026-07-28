import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "Пульт охраны — low poly 3D",
    description: "Играбельный 3D-прототип симулятора охранного предприятия.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Пульт охраны",
      description: "Откройте охранную фирму в уютном low-poly посёлке.",
      images: [{ url: image, width: 1672, height: 941, alt: "Пульт охраны — low-poly 3D игра" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Пульт охраны",
      description: "Откройте охранную фирму в уютном low-poly посёлке.",
      images: [image],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
