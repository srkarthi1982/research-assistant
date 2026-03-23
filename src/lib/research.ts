export type ResearchDraft = {
  topic: string;
  keyQuestions: string;
  notes: string;
  references: string;
  conclusions: string;
  showReferences: boolean;
  showConclusions: boolean;
};

export type ResearchSectionKey =
  | "keyQuestions"
  | "notes"
  | "references"
  | "conclusions";

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

export const getResearchSectionContent = (
  draft: ResearchDraft,
  key: ResearchSectionKey,
) => draft[key].trim() || researchPlaceholders[key];

export const buildResearchSectionText = (
  draft: ResearchDraft,
  key: ResearchSectionKey,
) => `${SECTION_TITLES[key]}\n${getResearchSectionContent(draft, key)}`;

export const buildResearchSummaryText = (draft: ResearchDraft) => {
  const lines: string[] = [
    draft.topic.trim() || "Untitled Research Topic",
    "",
    buildResearchSectionText(draft, "keyQuestions"),
    "",
    buildResearchSectionText(draft, "notes"),
  ];

  if (draft.showReferences) {
    lines.push("", buildResearchSectionText(draft, "references"));
  }

  if (draft.showConclusions) {
    lines.push("", buildResearchSectionText(draft, "conclusions"));
  }

  return lines.join("\n").trim();
};
