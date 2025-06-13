import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Chains",
  description: "View and manage your AI chain history",
};

export default function ChainsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
