import { column, defineTable, NOW } from "astro:db";

/**
 * High-level research project.
 * Example: "Climate change impact on aviation" or "Assignment – World War II Essay".
 */
export const ResearchProjects = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    // Owner (parent app Users.id)
    ownerId: column.text(),

    title: column.text(),
    description: column.text({ optional: true }),

    // Optional fields to group/filter
    topic: column.text({ optional: true }),
    tags: column.text({ optional: true }), // simple comma/space separated

    status: column.text({
      enum: ["active", "archived"],
      default: "active",
    }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

/**
 * A source attached to a project.
 * Could be a URL, PDF, book, video, etc.
 */
export const ResearchSources = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    projectId: column.number({ references: () => ResearchProjects.columns.id }),

    // What kind of source this is
    type: column.text({
      enum: ["web", "pdf", "book", "article", "video", "other"],
      default: "web",
    }),

    title: column.text(),
    url: column.text({ optional: true }),

    // Optional citation string (APA/MLA/etc) or BibTeX stored as text/json elsewhere.
    citationText: column.text({ optional: true }),
    citationMeta: column.json({ optional: true }),

    // Optional raw extracted text (snippet or whole doc if we store it)
    snippet: column.text({ optional: true }),

    // Any AI or processing metadata
    metadata: column.json({ optional: true }),

    createdAt: column.date({ default: NOW }),
  },
});

/**
 * Notes created inside a project.
 * Can be summaries, quotes, ideas, questions, etc.
 */
export const ResearchNotes = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    projectId: column.number({ references: () => ResearchProjects.columns.id }),

    // Optional link back to a specific source
    sourceId: column.number({
      references: () => ResearchSources.columns.id,
      optional: true,
    }),

    // Kind of note
    type: column.text({
      enum: ["summary", "quote", "idea", "question", "outline", "other"],
      default: "summary",
    }),

    // Main note body
    content: column.text(),

    // Optional structured fields
    heading: column.text({ optional: true }),
    tags: column.text({ optional: true }),

    // For quotes, we can store page/position info
    location: column.text({ optional: true }),

    // For AI-generated summaries/outlines
    aiMeta: column.json({ optional: true }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

/**
 * Optional: keep track of AI summary / citation generation jobs.
 * Useful if you later show "history" of auto-generated content.
 */
export const AiJobs = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    projectId: column.number({
      references: () => ResearchProjects.columns.id,
      optional: true,
    }),

    // What was this for?
    jobType: column.text({
      enum: ["summary", "outline", "citation", "other"],
      default: "summary",
    }),

    // Input prompt/context
    input: column.json({ optional: true }),

    // Result payload from AI
    output: column.json({ optional: true }),

    status: column.text({
      enum: ["pending", "completed", "failed"],
      default: "completed",
    }),

    createdAt: column.date({ default: NOW }),
  },
});

export const researchAssistantTables = {
  ResearchProjects,
  ResearchSources,
  ResearchNotes,
  AiJobs,
} as const;
