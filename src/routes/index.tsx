import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "PROCATE — Acesso" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => null,
});
