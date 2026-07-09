import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/base-mestre/produtos")({
  component: () => <Outlet />,
});
