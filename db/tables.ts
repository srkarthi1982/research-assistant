import { column, defineTable } from "astro:db";

export const ResearchProjects = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    title: column.text(),
    description: column.text({ optional: true }),
    subject: column.text({ optional: true }),
    status: column.text({ default: "active" }),
    createdAt: column.date(),
    updatedAt: column.date(),
    archivedAt: column.date({ optional: true }),
  },
  indexes: [
    { on: ["userId", "status"] },
    { on: ["userId", "updatedAt"] },
  ],
});

export const ResearchNotes = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    projectId: column.text({ references: () => ResearchProjects.columns.id }),
    title: column.text(),
    content: column.text(),
    topic: column.text({ optional: true }),
    sourceUrl: column.text({ optional: true }),
    notes: column.text({ optional: true }),
    isImportant: column.boolean({ default: false }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
  indexes: [
    { on: ["projectId", "updatedAt"] },
    { on: ["projectId", "isImportant"] },
  ],
});
