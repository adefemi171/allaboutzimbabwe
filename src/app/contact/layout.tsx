import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach Runeward Labs, the makers of All About Zimbabwe: report a mistake, suggest a guide, or send a message.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
