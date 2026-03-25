import { ActionError, defineAction } from "astro:actions";
import { and, db, desc, eq, ResearchNotes, ResearchProjects } from "astro:db";
import { z } from "astro:schema";
import { buildAppStarterSummary } from "../dashboard/summary.schema";
import { notifyParent } from "../lib/notifyParent";
import { pushAppStarterActivity } from "../lib/pushActivity";
import { createId, getOwnedProjectById, getProjectDetail, getProjectSummary } from "../lib/research";
import { requireUser } from "./_guards";

const projectInput = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  subject: z.string().trim().max(120).nullable().optional(),
});

const noteInput = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(10000),
  topic: z.string().trim().max(120).nullable().optional(),
  sourceUrl: z.string().trim().url().max(1000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const normalizeNullable = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
};

export const server = {
  createResearchProject: defineAction({
    accept: "json",
    input: projectInput,
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();
      const id = createId();

      const existing = await db
        .select({ id: ResearchProjects.id })
        .from(ResearchProjects)
        .where(eq(ResearchProjects.userId, user.id))
        .limit(1);

      await db.insert(ResearchProjects).values({
        id,
        userId: user.id,
        title: input.title,
        description: normalizeNullable(input.description),
        subject: normalizeNullable(input.subject),
        status: "active",
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      });

      const summary = await buildAppStarterSummary(user.id);
      await pushAppStarterActivity({
        userId: user.id,
        activity: {
          event: "research.project.created",
          occurredAt: now.toISOString(),
          entityId: id,
        },
        summary,
      });

      if (!existing.length) {
        await notifyParent({
          userId: user.id,
          title: "Research Assistant ready",
          message: "Your first research project has been created.",
          level: "success",
        });
      }

      return { id };
    },
  }),

  updateResearchProject: defineAction({
    accept: "json",
    input: projectInput.extend({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const ownedProject = await getOwnedProjectById(user.id, input.id);
      if (!ownedProject) {
        throw new ActionError({ code: "NOT_FOUND", message: "Project not found" });
      }

      await db
        .update(ResearchProjects)
        .set({
          title: input.title,
          description: normalizeNullable(input.description),
          subject: normalizeNullable(input.subject),
          updatedAt: new Date(),
        })
        .where(and(eq(ResearchProjects.id, input.id), eq(ResearchProjects.userId, user.id)));

      return { ok: true };
    },
  }),

  archiveResearchProject: defineAction({
    accept: "json",
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const project = await getOwnedProjectById(user.id, input.id);
      if (!project) throw new ActionError({ code: "NOT_FOUND", message: "Project not found" });

      const now = new Date();
      await db
        .update(ResearchProjects)
        .set({ status: "archived", archivedAt: now, updatedAt: now })
        .where(and(eq(ResearchProjects.id, input.id), eq(ResearchProjects.userId, user.id)));

      const summary = await buildAppStarterSummary(user.id);
      await pushAppStarterActivity({
        userId: user.id,
        activity: { event: "research.project.archived", occurredAt: now.toISOString(), entityId: input.id },
        summary,
      });

      return { ok: true };
    },
  }),

  restoreResearchProject: defineAction({
    accept: "json",
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const project = await getOwnedProjectById(user.id, input.id);
      if (!project) throw new ActionError({ code: "NOT_FOUND", message: "Project not found" });

      const now = new Date();
      await db
        .update(ResearchProjects)
        .set({ status: "active", archivedAt: null, updatedAt: now })
        .where(and(eq(ResearchProjects.id, input.id), eq(ResearchProjects.userId, user.id)));

      return { ok: true };
    },
  }),

  createResearchNote: defineAction({
    accept: "json",
    input: noteInput,
    handler: async (input, context) => {
      const user = requireUser(context);
      const project = await getOwnedProjectById(user.id, input.projectId);
      if (!project) throw new ActionError({ code: "NOT_FOUND", message: "Project not found" });

      const now = new Date();
      const id = createId();
      await db.insert(ResearchNotes).values({
        id,
        projectId: input.projectId,
        title: input.title,
        content: input.content,
        topic: normalizeNullable(input.topic),
        sourceUrl: normalizeNullable(input.sourceUrl),
        notes: normalizeNullable(input.notes),
        isImportant: false,
        createdAt: now,
        updatedAt: now,
      });

      await db
        .update(ResearchProjects)
        .set({ updatedAt: now })
        .where(and(eq(ResearchProjects.id, input.projectId), eq(ResearchProjects.userId, user.id)));

      return { id };
    },
  }),

  updateResearchNote: defineAction({
    accept: "json",
    input: noteInput.extend({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const project = await getOwnedProjectById(user.id, input.projectId);
      if (!project) throw new ActionError({ code: "NOT_FOUND", message: "Project not found" });

      const existing = await db
        .select()
        .from(ResearchNotes)
        .where(and(eq(ResearchNotes.id, input.id), eq(ResearchNotes.projectId, input.projectId)))
        .limit(1);

      if (!existing[0]) throw new ActionError({ code: "NOT_FOUND", message: "Note not found" });

      const now = new Date();
      await db
        .update(ResearchNotes)
        .set({
          title: input.title,
          content: input.content,
          topic: normalizeNullable(input.topic),
          sourceUrl: normalizeNullable(input.sourceUrl),
          notes: normalizeNullable(input.notes),
          updatedAt: now,
        })
        .where(and(eq(ResearchNotes.id, input.id), eq(ResearchNotes.projectId, input.projectId)));

      await db
        .update(ResearchProjects)
        .set({ updatedAt: now })
        .where(and(eq(ResearchProjects.id, input.projectId), eq(ResearchProjects.userId, user.id)));

      return { ok: true };
    },
  }),

  deleteResearchNote: defineAction({
    accept: "json",
    input: z.object({ id: z.string().min(1), projectId: z.string().min(1) }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const project = await getOwnedProjectById(user.id, input.projectId);
      if (!project) throw new ActionError({ code: "NOT_FOUND", message: "Project not found" });

      await db
        .delete(ResearchNotes)
        .where(and(eq(ResearchNotes.id, input.id), eq(ResearchNotes.projectId, input.projectId)));

      await db
        .update(ResearchProjects)
        .set({ updatedAt: new Date() })
        .where(and(eq(ResearchProjects.id, input.projectId), eq(ResearchProjects.userId, user.id)));

      return { ok: true };
    },
  }),

  toggleResearchNoteImportant: defineAction({
    accept: "json",
    input: z.object({ id: z.string().min(1), projectId: z.string().min(1), isImportant: z.boolean() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const project = await getOwnedProjectById(user.id, input.projectId);
      if (!project) throw new ActionError({ code: "NOT_FOUND", message: "Project not found" });

      const current = await db
        .select()
        .from(ResearchNotes)
        .where(and(eq(ResearchNotes.id, input.id), eq(ResearchNotes.projectId, input.projectId)))
        .limit(1);

      if (!current[0]) throw new ActionError({ code: "NOT_FOUND", message: "Note not found" });

      const now = new Date();
      await db
        .update(ResearchNotes)
        .set({ isImportant: input.isImportant, updatedAt: now })
        .where(and(eq(ResearchNotes.id, input.id), eq(ResearchNotes.projectId, input.projectId)));

      if (input.isImportant) {
        const summary = await getProjectSummary(user.id);
        if (summary.importantNotes === 1) {
          await notifyParent({
            userId: user.id,
            title: "First important note saved",
            message: "You marked your first important note in Research Assistant.",
            level: "info",
          });
        }
      }

      await db
        .update(ResearchProjects)
        .set({ updatedAt: now })
        .where(and(eq(ResearchProjects.id, input.projectId), eq(ResearchProjects.userId, user.id)));

      return { ok: true };
    },
  }),

  listResearchProjects: defineAction({
    accept: "json",
    input: z.object({ status: z.enum(["active", "archived"]).optional() }).optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const status = input?.status;
      const projects = await db
        .select()
        .from(ResearchProjects)
        .where(
          status
            ? and(eq(ResearchProjects.userId, user.id), eq(ResearchProjects.status, status))
            : eq(ResearchProjects.userId, user.id),
        )
        .orderBy(desc(ResearchProjects.updatedAt));

      return { projects };
    },
  }),

  getResearchProjectDetail: defineAction({
    accept: "json",
    input: z.object({ id: z.string().min(1), query: z.string().optional() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const detail = await getProjectDetail(user.id, input.id, input.query);
      if (!detail) throw new ActionError({ code: "NOT_FOUND", message: "Project not found" });
      return detail;
    },
  }),
};
