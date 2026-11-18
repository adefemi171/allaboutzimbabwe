import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Corrections",
  description:
    "Report a wrong fact, outdated price or map problem on All About Zimbabwe, and read the reviewed reports.",
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
