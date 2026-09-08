import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getMcpSession } from "./auth";
import {
  listNotes,
  getNoteContent,
  saveNote,
  createNote,
  renameNote,
  deleteNote,
  createSubfolder,
  moveItem,
  ensureNetheriteFolder,
} from "~/server/googleDrive";
import { buildApollonModel } from "./diagramBuilders/apollonBuilder";
import { buildExcalidrawScene } from "./diagramBuilders/excalidrawBuilder";
import { validateAndFormatMermaid } from "./diagramBuilders/mermaidBuilder";

export function createNetheriteMcpServer() {
  const server = new McpServer({
    name: "netherite-mcp",
    version: "1.0.0",
  });

  // ==========================================
  // TOOL 1: List Files & Folders
  // ==========================================
  server.tool(
    "netherite_list_files",
    "List all files and folders stored in Netherite's sovereign Google Drive workspace. Can filter by item type or parent folder.",
    {
      type: z
        .enum(["all", "markdown", "uml", "mermaid", "drawing", "folder"])
        .optional()
        .describe("Filter by file type: 'markdown' (.md), 'uml' (.apollon), 'mermaid' (.mmd), 'drawing' (.excalidraw), 'folder', or 'all'"),
      parentId: z
        .string()
        .optional()
        .describe("Optional Google Drive parent folder ID to list items inside a specific folder"),
    },
    async ({ type = "all", parentId }) => {
      try {
        const session = getMcpSession();
        const allItems = await listNotes(session);

        let filtered = allItems;
        if (parentId) {
          filtered = filtered.filter((i: any) => i.parents?.includes(parentId));
        }

        if (type !== "all") {
          filtered = filtered.filter((item: any) => {
            const isFolder = item.mimeType === "application/vnd.google-apps.folder";
            if (type === "folder") return isFolder;
            if (isFolder) return false;

            const name = (item.name || "").toLowerCase();
            if (type === "markdown") return name.endsWith(".md");
            if (type === "uml") return name.endsWith(".apollon") || name.endsWith(".uml");
            if (type === "mermaid") return name.endsWith(".mmd") || name.endsWith(".mermaid");
            if (type === "drawing") return name.endsWith(".excalidraw");
            return true;
          });
        }

        const formatted = filtered.map((item: any) => {
          const isFolder = item.mimeType === "application/vnd.google-apps.folder";
          const name = item.name || "Untitled";
          let itemType = "markdown";
          if (isFolder) itemType = "folder";
          else if (name.endsWith(".apollon") || name.endsWith(".uml")) itemType = "uml";
          else if (name.endsWith(".mmd") || name.endsWith(".mermaid")) itemType = "mermaid";
          else if (name.endsWith(".excalidraw")) itemType = "drawing";

          return {
            id: item.id,
            name: item.name,
            type: itemType,
            mimeType: item.mimeType,
            modifiedTime: item.modifiedTime,
            parents: item.parents,
          };
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: formatted.length,
                  workspaceRoot: "Netherite",
                  files: formatted,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to list files: ${err.message}` }],
        };
      }
    }
  );

  // ==========================================
  // TOOL 2: Search Notes
  // ==========================================
  server.tool(
    "netherite_search_notes",
    "Search through notes and diagrams in Netherite by keyword, title, or content snippet.",
    {
      query: z.string().describe("Search query term or filename fragment"),
      limit: z.number().optional().describe("Maximum number of results to return (default 10)"),
    },
    async ({ query, limit = 10 }) => {
      try {
        const session = getMcpSession();
        const allItems = await listNotes(session);
        const lowerQ = query.toLowerCase();

        // 1. Name matches first
        const matchedItems = allItems.filter((i: any) =>
          (i.name || "").toLowerCase().includes(lowerQ)
        );

        const results = matchedItems.slice(0, limit).map((i: any) => ({
          id: i.id,
          name: i.name,
          modifiedTime: i.modifiedTime,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ query, count: results.length, matches: results }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Search failed: ${err.message}` }],
        };
      }
    }
  );

  // ==========================================
  // TOOL 3: Read Note Content
  // ==========================================
  server.tool(
    "netherite_read_note",
    "Read the full raw content and metadata of a note or diagram by its ID or exact filename.",
    {
      fileId: z.string().optional().describe("The Google Drive file ID of the document"),
      fileName: z.string().optional().describe("Alternatively, the exact file name (e.g. 'Overview.md', 'Architecture.apollon')"),
    },
    async ({ fileId, fileName }) => {
      try {
        const session = getMcpSession();
        let targetId = fileId;

        if (!targetId && fileName) {
          const items = await listNotes(session);
          const found = items.find(
            (i: any) => (i.name || "").toLowerCase() === fileName.toLowerCase()
          );
          if (!found) {
            return {
              isError: true,
              content: [{ type: "text", text: `File not found with name: ${fileName}` }],
            };
          }
          targetId = found.id;
        }

        if (!targetId) {
          return {
            isError: true,
            content: [{ type: "text", text: "Either fileId or fileName must be provided." }],
          };
        }

        const content = await getNoteContent(session, targetId);
        return {
          content: [
            {
              type: "text",
              text: typeof content === "string" ? content : JSON.stringify(content, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to read note: ${err.message}` }],
        };
      }
    }
  );

  // ==========================================
  // TOOL 4: Create Markdown Note
  // ==========================================
  server.tool(
    "netherite_create_markdown",
    "Create a scientific Markdown note in Netherite. Supports headings, KaTeX math expressions ($inline$ and $$display$$), tables, callouts, and code blocks.",
    {
      title: z.string().describe("The document title (e.g. 'Microservices Architecture.md')"),
      content: z.string().describe("Markdown content with LaTeX math and code blocks"),
      parentId: z.string().optional().describe("Optional folder ID to create inside"),
    },
    async ({ title, content, parentId }) => {
      try {
        const session = getMcpSession();
        const cleanTitle = title.endsWith(".md") ? title : `${title}.md`;
        const res = await createNote(session, cleanTitle, content, parentId, "note");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Created Markdown document: ${cleanTitle}`,
                  id: res?.id,
                  name: cleanTitle,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to create Markdown note: ${err.message}` }],
        };
      }
    }
  );

  // ==========================================
  // TOOL 5: Create Mermaid Diagram
  // ==========================================
  server.tool(
    "netherite_create_mermaid",
    "Create a declarative Mermaid diagram (.mmd) in Netherite. Supports Flowcharts (TD/LR), Sequence Diagrams, Class Diagrams, State Diagrams, ER Diagrams, Git Graphs, Gantt Roadmaps, Pie Charts, and Mindmaps.",
    {
      title: z.string().describe("Diagram title (e.g. 'checkout-flow.mmd')"),
      code: z.string().describe("Mermaid syntax (e.g. 'sequenceDiagram\\nUser->>API: Request')"),
      parentId: z.string().optional().describe("Optional folder ID to create inside"),
    },
    async ({ title, code, parentId }) => {
      try {
        const session = getMcpSession();
        const cleanTitle = title.endsWith(".mmd") || title.endsWith(".mermaid") ? title : `${title}.mmd`;
        const { formattedCode } = validateAndFormatMermaid(code);

        const res = await createNote(session, cleanTitle, formattedCode, parentId, "mermaid");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Created Mermaid diagram: ${cleanTitle}`,
                  id: res?.id,
                  name: cleanTitle,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to create Mermaid diagram: ${err.message}` }],
        };
      }
    }
  );

  // ==========================================
  // TOOL 6: Create Apollon UML Diagram
  // ==========================================
  server.tool(
    "netherite_create_uml",
    "Create a professional UML architectural model (.apollon) supporting all 13 diagram types (ClassDiagram, ActivityDiagram, ComponentDiagram, DeploymentDiagram, BPMN, Flowchart, UseCaseDiagram, StateDiagram, PetriNet, etc.). Can accept intuitive classes & relationships with auto-layout OR raw Apollon 4.2.0 JSON.",
    {
      title: z.string().describe("Diagram title (e.g. 'Billing Service.apollon')"),
      diagramType: z
        .enum([
          "ClassDiagram",
          "ActivityDiagram",
          "ComponentDiagram",
          "DeploymentDiagram",
          "BPMN",
          "Flowchart",
          "UseCaseDiagram",
          "CommunicationDiagram",
          "StateDiagram",
          "PetriNet",
          "ReachabilityGraph",
          "SyntaxTree",
          "SequentialFunctionChart",
        ])
        .default("ClassDiagram")
        .describe("One of the 13 Apollon diagram specifications"),
      classes: z
        .array(
          z.object({
            name: z.string(),
            stereotype: z.enum(["Interface", "Enumeration"]).optional(),
            isAbstract: z.boolean().optional(),
            attributes: z.array(z.string()).optional().describe("Attribute signatures e.g. ['+ id: UUID', '- total: number']"),
            methods: z.array(z.string()).optional().describe("Method signatures e.g. ['+ calculate(): void']"),
            fillColor: z.string().optional(),
            strokeColor: z.string().optional(),
          })
        )
        .optional()
        .describe("Classes for ClassDiagram (auto-laid out in clean columns with optimal spacing)"),
      relationships: z
        .array(
          z.object({
            from: z.string().describe("Source class name"),
            to: z.string().describe("Target class name"),
            type: z.enum(["Inheritance", "Aggregation", "Composition", "Unidirectional", "Bidirectional", "Dependency"]).optional(),
            name: z.string().optional(),
            multiplicity: z.string().optional(),
          })
        )
        .optional()
        .describe("Relationships connecting the classes with arrows"),
      nodes: z
        .array(
          z.object({
            name: z.string(),
            type: z.string().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            fillColor: z.string().optional(),
          })
        )
        .optional()
        .describe("Nodes for Activity, Component, Deployment, or BPMN diagrams"),
      edges: z
        .array(
          z.object({
            from: z.string(),
            to: z.string(),
            type: z.string().optional(),
            name: z.string().optional(),
          })
        )
        .optional()
        .describe("Edges connecting generic nodes"),
      rawModel: z.any().optional().describe("Optional pre-formed Apollon 4.2.0 JSON model"),
      parentId: z.string().optional().describe("Optional folder ID to create inside"),
    },
    async ({ title, diagramType, classes, relationships, nodes, edges, rawModel, parentId }) => {
      try {
        const session = getMcpSession();
        const cleanTitle = title.endsWith(".apollon") || title.endsWith(".uml") ? title : `${title}.apollon`;

        const model = buildApollonModel({
          title: cleanTitle,
          diagramType,
          classes,
          relationships,
          nodes,
          edges,
          rawModel,
        });

        const contentString = JSON.stringify(model, null, 2);
        const res = await createNote(session, cleanTitle, contentString, parentId, "uml");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Created Apollon ${diagramType} model: ${cleanTitle}`,
                  id: res?.id,
                  name: cleanTitle,
                  diagramType,
                  nodeCount: model.nodes?.length || 0,
                  edgeCount: model.edges?.length || 0,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to create Apollon UML model: ${err.message}` }],
        };
      }
    }
  );

  // ==========================================
  // TOOL 7: Create Excalidraw Whiteboard Drawing
  // ==========================================
  server.tool(
    "netherite_create_drawing",
    "Create an Excalidraw vector canvas drawing (.excalidraw) in Netherite. Accepts simple shapes (cards, rectangles, ellipses, diamonds, text) with automatic grid placement and connecting arrows, OR raw Excalidraw JSON.",
    {
      title: z.string().describe("Drawing title (e.g. 'Cloud Infrastructure.excalidraw')"),
      shapes: z
        .array(
          z.object({
            id: z.string().optional(),
            type: z.enum(["rectangle", "ellipse", "diamond", "text"]).default("rectangle"),
            label: z.string().describe("Label text displayed in the shape"),
            backgroundColor: z.string().optional().describe("Hex color e.g. '#e0e7ff' (indigo), '#dcfce7' (emerald), '#fef3c7' (amber)"),
            strokeColor: z.string().optional(),
            fillStyle: z.enum(["solid", "hachure", "cross-hatch"]).optional(),
          })
        )
        .optional()
        .describe("High-level visual shapes to place on the canvas"),
      connections: z
        .array(
          z.object({
            from: z.string().describe("Shape label or ID to start arrow from"),
            to: z.string().describe("Shape label or ID to point arrow to"),
            label: z.string().optional().describe("Optional label on the arrow"),
            strokeColor: z.string().optional(),
            strokeStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
          })
        )
        .optional()
        .describe("Directed arrows connecting the shapes"),
      theme: z.enum(["dark", "light"]).default("dark").describe("Canvas background theme"),
      rawScene: z.any().optional().describe("Optional pre-formed Excalidraw JSON scene"),
      parentId: z.string().optional().describe("Optional folder ID to create inside"),
    },
    async ({ title, shapes, connections, theme, rawScene, parentId }) => {
      try {
        const session = getMcpSession();
        const cleanTitle = title.endsWith(".excalidraw") ? title : `${title}.excalidraw`;

        const scene = buildExcalidrawScene({
          title: cleanTitle,
          shapes,
          connections,
          theme,
          rawScene,
        });

        const contentString = JSON.stringify(scene, null, 2);
        const res = await createNote(session, cleanTitle, contentString, parentId, "drawing");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Created Excalidraw whiteboard: ${cleanTitle}`,
                  id: res?.id,
                  name: cleanTitle,
                  elementCount: scene.elements?.length || 0,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to create Excalidraw drawing: ${err.message}` }],
        };
      }
    }
  );

  // ==========================================
  // TOOL 8: Update / Append Note
  // ==========================================
  server.tool(
    "netherite_update_note",
    "Update an existing note, diagram, or canvas in Netherite. Supports complete replacement or appending text (for Markdown/Mermaid).",
    {
      fileId: z.string().describe("Google Drive file ID of the note to update"),
      content: z.string().describe("The new content string or content to append"),
      mode: z.enum(["replace", "append"]).default("replace").describe("'replace' to overwrite completely, or 'append' to add to end"),
    },
    async ({ fileId, content, mode }) => {
      try {
        const session = getMcpSession();
        let contentToWrite = content;

        if (mode === "append") {
          const current = await getNoteContent(session, fileId);
          const currentStr = typeof current === "string" ? current : JSON.stringify(current, null, 2);
          contentToWrite = `${currentStr.trim()}\n\n${content.trim()}`;
        }

        await saveNote(session, fileId, contentToWrite);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Updated file ${fileId} (${mode})`,
                  bytesWritten: contentToWrite.length,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to update note: ${err.message}` }],
        };
      }
    }
  );

  // ==========================================
  // TOOL 9: Manage Folders & Movement
  // ==========================================
  server.tool(
    "netherite_manage_folders",
    "Create folders or move files and subfolders in Netherite's sovereign Google Drive workspace.",
    {
      action: z.enum(["create_folder", "move_item"]).describe("Action to perform"),
      name: z.string().optional().describe("Folder name (required when action is 'create_folder')"),
      fileId: z.string().optional().describe("File or folder ID to move (required when action is 'move_item')"),
      targetFolderId: z.string().optional().describe("Destination folder ID"),
    },
    async ({ action, name, fileId, targetFolderId }) => {
      try {
        const session = getMcpSession();

        if (action === "create_folder") {
          if (!name) throw new Error("Folder name is required.");
          const folder = await createSubfolder(session, name, targetFolderId);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ success: true, folderId: folder.id, name }, null, 2),
              },
            ],
          };
        } else if (action === "move_item") {
          if (!fileId || !targetFolderId) {
            throw new Error("Both fileId and targetFolderId are required to move an item.");
          }
          await moveItem(session, fileId, targetFolderId);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ success: true, movedId: fileId, targetFolderId }, null, 2),
              },
            ],
          };
        }

        throw new Error(`Unknown action: ${action}`);
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Folder operation failed: ${err.message}` }],
        };
      }
    }
  );

  // ==========================================
  // TOOL 10: Delete File or Folder
  // ==========================================
  server.tool(
    "netherite_delete_file",
    "Move a note, diagram, drawing, or folder to Google Drive trash in Netherite.",
    {
      fileId: z.string().describe("The Google Drive file ID to delete"),
    },
    async ({ fileId }) => {
      try {
        const session = getMcpSession();
        await deleteNote(session, fileId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, deletedFileId: fileId }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to delete file: ${err.message}` }],
        };
      }
    }
  );

  // ==========================================
  // MCP RESOURCES
  // ==========================================
  server.resource(
    "all_notes",
    "netherite://notes",
    async (uri) => {
      try {
        const session = getMcpSession();
        const items = await listNotes(session);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(items, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Error loading notes: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  return server;
}
