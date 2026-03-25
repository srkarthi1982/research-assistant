import { APP_META } from "../app.meta";
import { getProjectSummary } from "../lib/research";

export type AppStarterDashboardSummaryV1 = {
  appId: typeof APP_META.key;
  version: 1;
  updatedAt: string;
  status: "ready";
  primaryRoute: "/app";
  totals: {
    projects: number;
    activeProjects: number;
    archivedProjects: number;
    notes: number;
    importantNotes: number;
  };
  mostRecentProject: {
    id: string;
    title: string;
    updatedAt: string;
  } | null;
};

export const buildAppStarterSummary = async (userId: string): Promise<AppStarterDashboardSummaryV1> => {
  const summary = await getProjectSummary(userId);

  return {
    appId: APP_META.key,
    version: 1,
    updatedAt: new Date().toISOString(),
    status: "ready",
    primaryRoute: "/app",
    totals: {
      projects: summary.totalProjects,
      activeProjects: summary.activeProjects,
      archivedProjects: summary.archivedProjects,
      notes: summary.totalNotes,
      importantNotes: summary.importantNotes,
    },
    mostRecentProject: summary.mostRecentProject,
  };
};
