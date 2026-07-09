import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/base-mestre/materiais")({
  component: () => <Outlet />,
});
