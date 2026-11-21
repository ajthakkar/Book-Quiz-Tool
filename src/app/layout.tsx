import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = Inter({ variable: "--font-sans-face", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif-face", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Book Quiz Tool",
  description:
    "Reading-comprehension quizzes written from the full text of public-domain books, with every answer checked against the page it came from.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
