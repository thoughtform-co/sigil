/**
 * UI-facing labels for the navigation hierarchy.
 * Maps internal model names (WorkspaceProject, Project, Session) to user-facing terms.
 */
export const TERMS = {
  journey: { singular: "journey", plural: "journeys" },
  route: { singular: "route", plural: "routes" },
  waypoint: { singular: "waypoint", plural: "waypoints" },
  creationSuite: { singular: "creation suite", plural: "creation suites" },
} as const;

export type JourneyMode = "learn" | "create";
