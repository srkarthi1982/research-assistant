import { and, db, desc, eq, inArray, sql, ResearchNotes, ResearchProjects } from "astro:db";

export type ResearchDraft = {
  topic: string;
  keyQuestions: string;
  notes: string;
  references: string;
  conclusions: string;
  showReferences: boolean;
  showConclusions: boolean;
};

export type ResearchSectionKey = "keyQuestions" | "notes" | "references" | "conclusions";

export const RESEARCH_STORAGE_KEY = "ansiversa:research-assistant:v1:draft";

export const createDefaultResearchDraft = (): ResearchDraft => ({
  topic: "",
  keyQuestions: "",
  notes: "",
  references: "",
  conclusions: "",
  showReferences: true,
  showConclusions: true,
});

export const researchPlaceholders: Record<ResearchSectionKey, string> = {
  keyQuestions: "List the questions you need this research to answer so the work stays focused and purposeful.",
  notes: "Capture the strongest insights, findings, or observations you want to keep organized.",
  references: "Add useful sources, links, or citations that support the research direction.",
  conclusions: "Write the current takeaway, next decision, or conclusion you want this research to support.",
};

const SECTION_TITLES: Record<ResearchSectionKey, string> = {
  keyQuestions: "Key Questions",
  notes: "Notes / Insights",
  references: "References / Sources",
  conclusions: "Conclusions",
};

export const getResearchSectionTitle = (key: ResearchSectionKey) => SECTION_TITLES[key];
export const getResearchSectionContent = (draft: ResearchDraft, key: ResearchSectionKey) =>
  draft[key].trim() || researchPlaceholders[key];
export const buildResearchSectionText = (draft: ResearchDraft, key: ResearchSectionKey) =>
  `${SECTION_TITLES[key]}\n${getResearchSectionContent(draft, key)}`;
export const buildResearchSummaryText = (draft: ResearchDraft) => {
  const lines: string[] = [
    draft.topic.trim() || "Untitled Research Topic",
    "",
    buildResearchSectionText(draft, "keyQuestions"),
    "",
    buildResearchSectionText(draft, "notes"),
  ];
  if (draft.showReferences) lines.push("", buildResearchSectionText(draft, "references"));
  if (draft.showConclusions) lines.push("", buildResearchSectionText(draft, "conclusions"));
  return lines.join("\n").trim();
};

export const createId = () => crypto.randomUUID();

export const getOwnedProjectById = async (userId: string, projectId: string) => {
  const rows = await db
    .select()
    .from(ResearchProjects)
    .where(and(eq(ResearchProjects.userId, userId), eq(ResearchProjects.id, projectId)))
    .limit(1);

  return rows[0] ?? null;
};

export const getProjectDetail = async (userId: string, projectId: string, query?: string) => {
  const project = await getOwnedProjectById(userId, projectId);
  if (!project) return null;

  const term = query?.trim();
  const noteWhere = term
    ? and(
        eq(ResearchNotes.projectId, projectId),
        sql`(${ResearchNotes.title} LIKE ${`%${term}%`} OR ${ResearchNotes.content} LIKE ${`%${term}%`} OR ${ResearchNotes.topic} LIKE ${`%${term}%`})`,
      )
    : eq(ResearchNotes.projectId, projectId);

  const notes = await db
    .select()
    .from(ResearchNotes)
    .where(noteWhere)
    .orderBy(desc(ResearchNotes.isImportant), desc(ResearchNotes.updatedAt));

  return { project, notes };
};

export const getProjectSummary = async (userId: string) => {
  const projects = await db.select().from(ResearchProjects).where(eq(ResearchProjects.userId, userId));

  const projectIds = projects.map((project) => project.id);
  const notes = projectIds.length
    ? await db.select().from(ResearchNotes).where(inArray(ResearchNotes.projectId, projectIds))
    : [];

  const activeProjects = projects.filter((project) => project.status === "active");
  const archivedProjects = projects.filter((project) => project.status === "archived");
  const mostRecentProject = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];

  return {
    totalProjects: projects.length,
    activeProjects: activeProjects.length,
    archivedProjects: archivedProjects.length,
    totalNotes: notes.length,
    importantNotes: notes.filter((note) => note.isImportant).length,
    mostRecentProject: mostRecentProject
      ? { id: mostRecentProject.id, title: mostRecentProject.title, updatedAt: mostRecentProject.updatedAt.toISOString() }
      : null,
  };
};
