/**
 * UI-facing labels for the three-level navigation hierarchy.
 * Maps internal model names (WorkspaceProject, Project, Session) to user-facing terms.
 */
export const TERMS = {
  journey: { singular: "journey", plural: "journeys" },
  route: { singular: "route", plural: "routes" },
  waypoint: { singular: "waypoint", plural: "waypoints" },
} as const;
