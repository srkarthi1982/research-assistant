import type { ActionAPIContext } from "astro:actions";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import {
  db,
  eq,
  and,
  ResearchProjects,
  ResearchSources,
  ResearchNotes,
  AiJobs,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createProject: defineAction({
    input: z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      topic: z.string().optional(),
      tags: z.string().optional(),
      status: z.enum(["active", "archived"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [project] = await db
        .insert(ResearchProjects)
        .values({
          ownerId: user.id,
          title: input.title,
          description: input.description,
          topic: input.topic,
          tags: input.tags,
          status: input.status ?? "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { project };
    },
  }),

  updateProject: defineAction({
    input: z.object({
      id: z.number().int(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      topic: z.string().optional(),
      tags: z.string().optional(),
      status: z.enum(["active", "archived"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const { id, ...rest } = input;

      const [existing] = await db
        .select()
        .from(ResearchProjects)
        .where(and(eq(ResearchProjects.id, id), eq(ResearchProjects.ownerId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (typeof value !== "undefined") {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { project: existing };
      }

      const [project] = await db
        .update(ResearchProjects)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(ResearchProjects.id, id), eq(ResearchProjects.ownerId, user.id)))
        .returning();

      return { project };
    },
  }),

  archiveProject: defineAction({
    input: z.object({
      id: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [project] = await db
        .update(ResearchProjects)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(ResearchProjects.id, input.id), eq(ResearchProjects.ownerId, user.id)))
        .returning();

      if (!project) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      return { project };
    },
  }),

  listProjects: defineAction({
    input: z
      .object({
        includeArchived: z.boolean().optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const includeArchived = input?.includeArchived ?? false;

      const projects = await db
        .select()
        .from(ResearchProjects)
        .where(eq(ResearchProjects.ownerId, user.id));

      const filtered = includeArchived
        ? projects
        : projects.filter((project) => project.status === "active");

      return { projects: filtered };
    },
  }),

  getProjectWithDetails: defineAction({
    input: z.object({
      id: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [project] = await db
        .select()
        .from(ResearchProjects)
        .where(and(eq(ResearchProjects.id, input.id), eq(ResearchProjects.ownerId, user.id)))
        .limit(1);

      if (!project) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      const sources = await db
        .select()
        .from(ResearchSources)
        .where(eq(ResearchSources.projectId, input.id));

      const notes = await db
        .select()
        .from(ResearchNotes)
        .where(eq(ResearchNotes.projectId, input.id));

      return { project, sources, notes };
    },
  }),

  saveSource: defineAction({
    input: z.object({
      id: z.number().int().optional(),
      projectId: z.number().int(),
      type: z.enum(["web", "pdf", "book", "article", "video", "other"]).optional(),
      title: z.string().min(1, "Title is required"),
      url: z.string().url().optional(),
      citationText: z.string().optional(),
      citationMeta: z.any().optional(),
      snippet: z.string().optional(),
      metadata: z.any().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [project] = await db
        .select()
        .from(ResearchProjects)
        .where(and(eq(ResearchProjects.id, input.projectId), eq(ResearchProjects.ownerId, user.id)))
        .limit(1);

      if (!project) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      const baseValues = {
        projectId: input.projectId,
        type: input.type ?? "web",
        title: input.title,
        url: input.url,
        citationText: input.citationText,
        citationMeta: input.citationMeta,
        snippet: input.snippet,
        metadata: input.metadata,
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(ResearchSources)
          .where(eq(ResearchSources.id, input.id))
          .limit(1);

        if (!existing || existing.projectId !== input.projectId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Source not found.",
          });
        }

        const [source] = await db
          .update(ResearchSources)
          .set(baseValues)
          .where(eq(ResearchSources.id, input.id))
          .returning();

        return { source };
      }

      const [source] = await db.insert(ResearchSources).values(baseValues).returning();
      return { source };
    },
  }),

  deleteSource: defineAction({
    input: z.object({
      id: z.number().int(),
      projectId: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [project] = await db
        .select()
        .from(ResearchProjects)
        .where(and(eq(ResearchProjects.id, input.projectId), eq(ResearchProjects.ownerId, user.id)))
        .limit(1);

      if (!project) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      const [deleted] = await db
        .delete(ResearchSources)
        .where(and(eq(ResearchSources.id, input.id), eq(ResearchSources.projectId, input.projectId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Source not found.",
        });
      }

      return { source: deleted };
    },
  }),

  saveNote: defineAction({
    input: z.object({
      id: z.number().int().optional(),
      projectId: z.number().int(),
      sourceId: z.number().int().optional(),
      type: z
        .enum(["summary", "quote", "idea", "question", "outline", "other"])
        .optional(),
      content: z.string().min(1, "Content is required"),
      heading: z.string().optional(),
      tags: z.string().optional(),
      location: z.string().optional(),
      aiMeta: z.any().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [project] = await db
        .select()
        .from(ResearchProjects)
        .where(and(eq(ResearchProjects.id, input.projectId), eq(ResearchProjects.ownerId, user.id)))
        .limit(1);

      if (!project) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      if (input.sourceId) {
        const [source] = await db
          .select()
          .from(ResearchSources)
          .where(
            and(
              eq(ResearchSources.id, input.sourceId),
              eq(ResearchSources.projectId, input.projectId)
            )
          )
          .limit(1);

        if (!source) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Source not found.",
          });
        }
      }

      const baseValues = {
        projectId: input.projectId,
        sourceId: input.sourceId,
        type: input.type ?? "summary",
        content: input.content,
        heading: input.heading,
        tags: input.tags,
        location: input.location,
        aiMeta: input.aiMeta,
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(ResearchNotes)
          .where(eq(ResearchNotes.id, input.id))
          .limit(1);

        if (!existing || existing.projectId !== input.projectId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Note not found.",
          });
        }

        const [note] = await db
          .update(ResearchNotes)
          .set({
            ...baseValues,
            updatedAt: new Date(),
          })
          .where(eq(ResearchNotes.id, input.id))
          .returning();

        return { note };
      }

      const [note] = await db
        .insert(ResearchNotes)
        .values({
          ...baseValues,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return { note };
    },
  }),

  deleteNote: defineAction({
    input: z.object({
      id: z.number().int(),
      projectId: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [project] = await db
        .select()
        .from(ResearchProjects)
        .where(and(eq(ResearchProjects.id, input.projectId), eq(ResearchProjects.ownerId, user.id)))
        .limit(1);

      if (!project) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      const [deleted] = await db
        .delete(ResearchNotes)
        .where(and(eq(ResearchNotes.id, input.id), eq(ResearchNotes.projectId, input.projectId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Note not found.",
        });
      }

      return { note: deleted };
    },
  }),

  createJob: defineAction({
    input: z.object({
      projectId: z.number().int().optional(),
      jobType: z.enum(["summary", "outline", "citation", "other"]).optional(),
      input: z.any().optional(),
      output: z.any().optional(),
      status: z.enum(["pending", "completed", "failed"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      if (input.projectId) {
        const [project] = await db
          .select()
          .from(ResearchProjects)
          .where(and(eq(ResearchProjects.id, input.projectId), eq(ResearchProjects.ownerId, user.id)))
          .limit(1);

        if (!project) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Project not found.",
          });
        }
      }

      const [job] = await db
        .insert(AiJobs)
        .values({
          projectId: input.projectId,
          jobType: input.jobType ?? "summary",
          input: input.input,
          output: input.output,
          status: input.status ?? "pending",
          createdAt: new Date(),
        })
        .returning();

      return { job };
    },
  }),

  updateJob: defineAction({
    input: z.object({
      id: z.number().int(),
      output: z.any().optional(),
      status: z.enum(["pending", "completed", "failed"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(AiJobs)
        .where(eq(AiJobs.id, input.id))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Job not found.",
        });
      }

      if (existing.projectId) {
        const [project] = await db
          .select()
          .from(ResearchProjects)
          .where(
            and(eq(ResearchProjects.id, existing.projectId), eq(ResearchProjects.ownerId, user.id))
          )
          .limit(1);

        if (!project) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Project not found.",
          });
        }
      }

      const updateData: Record<string, unknown> = {};
      if (typeof input.output !== "undefined") updateData.output = input.output;
      if (typeof input.status !== "undefined") updateData.status = input.status;

      if (Object.keys(updateData).length === 0) {
        return { job: existing };
      }

      const [job] = await db
        .update(AiJobs)
        .set(updateData)
        .where(eq(AiJobs.id, input.id))
        .returning();

      return { job };
    },
  }),

  listJobs: defineAction({
    input: z
      .object({
        projectId: z.number().int().optional(),
        status: z.enum(["pending", "completed", "failed"]).optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);

      const userProjects = await db
        .select()
        .from(ResearchProjects)
        .where(eq(ResearchProjects.ownerId, user.id));

      const allowedProjectIds = new Set(userProjects.map((p) => p.id));

      if (input?.projectId && !allowedProjectIds.has(input.projectId)) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      }

      const jobs = await db.select().from(AiJobs);

      const filtered = jobs.filter((job) => {
        const matchesProject =
          typeof job.projectId === "number" ? allowedProjectIds.has(job.projectId) : false;
        const matchesStatus = input?.status ? job.status === input.status : true;
        const matchesRequestedProject = input?.projectId
          ? job.projectId === input.projectId
          : true;
        return matchesProject && matchesStatus && matchesRequestedProject;
      });

      return { jobs: filtered };
    },
  }),
};
