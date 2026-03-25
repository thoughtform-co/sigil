import { RouteSummaryCard } from "@/components/ui/cards/RouteSummaryCard";

type ProjectCardProps = {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  waypointCount?: number;
};

export function ProjectCard({ id, name, description, updatedAt, waypointCount }: ProjectCardProps) {
  return (
    <RouteSummaryCard
      name={name}
      description={description}
      href={`/routes/${id}/image`}
      updatedAt={updatedAt}
      waypointCount={waypointCount}
    />
  );
}
