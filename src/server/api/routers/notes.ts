import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  listNotes,
  getNoteContent,
  saveNote,
  createNote,
  renameNote,
  deleteNote,
  uploadAsset,
  createSubfolder,
  moveItem,
  getWorkspaceMetadata,
  saveWorkspaceMetadata,
} from "~/server/googleDrive";

export const notesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await listNotes(ctx.session);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await getNoteContent(ctx.session, input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        content: z.string().optional(),
        parentId: z.string().optional(),
        type: z.enum(["note", "drawing"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createNote(
        ctx.session,
        input.name,
        input.content ?? "",
        input.parentId,
        input.type ?? "note"
      );
    }),

  createFolder: protectedProcedure
    .input(z.object({ name: z.string(), parentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return await createSubfolder(ctx.session, input.name, input.parentId);
    }),

  move: protectedProcedure
    .input(z.object({ fileId: z.string(), targetFolderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await moveItem(ctx.session, input.fileId, input.targetFolderId);
      return { success: true };
    }),

  save: protectedProcedure
    .input(z.object({ id: z.string(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await saveNote(ctx.session, input.id, input.content);
      return { success: true };
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), newName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await renameNote(ctx.session, input.id, input.newName);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteNote(ctx.session, input.id);
      return { success: true };
    }),

  uploadAsset: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        mimeType: z.string(),
        base64Data: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      return await uploadAsset(
        ctx.session,
        input.fileName,
        input.mimeType,
        buffer
      );
    }),

  getMetadata: protectedProcedure.query(async ({ ctx }) => {
    return await getWorkspaceMetadata(ctx.session);
  }),

  saveMetadata: protectedProcedure
    .input(
      z.object({
        folderColors: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await saveWorkspaceMetadata(ctx.session, input);
    }),
});

