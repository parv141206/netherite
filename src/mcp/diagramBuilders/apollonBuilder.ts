import crypto from "crypto";

export interface ApollonClassInput {
  name: string;
  stereotype?: "Interface" | "Enumeration";
  isAbstract?: boolean;
  attributes?: string[];
  methods?: string[];
  x?: number;
  y?: number;
  fillColor?: string;
  strokeColor?: string;
}

export interface ApollonRelationshipInput {
  from: string; // Class name or node ID
  to: string;   // Class name or node ID
  type?: "Inheritance" | "Aggregation" | "Composition" | "Unidirectional" | "Bidirectional" | "Dependency";
  name?: string;
  multiplicity?: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
}

export interface ApollonGenericNodeInput {
  name: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fillColor?: string;
}

export interface ApollonGenericEdgeInput {
  from: string;
  to: string;
  type?: string;
  name?: string;
}

export interface BuildApollonInput {
  title: string;
  diagramType: string;
  classes?: ApollonClassInput[];
  relationships?: ApollonRelationshipInput[];
  nodes?: ApollonGenericNodeInput[];
  edges?: ApollonGenericEdgeInput[];
  rawModel?: any;
}

function uid(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `elem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

export function buildApollonModel(input: BuildApollonInput): any {
  if (input.rawModel && typeof input.rawModel === "object") {
    const raw = input.rawModel;
    if (!raw.version) raw.version = "4.2.0";
    if (!raw.id) raw.id = uid();
    if (!raw.title) raw.title = input.title.replace(/\.apollon$/i, "");
    if (!raw.type) raw.type = input.diagramType || "ClassDiagram";
    if (!raw.nodes) raw.nodes = [];
    if (!raw.edges) raw.edges = [];
    if (!raw.assessments) raw.assessments = {};
    return raw;
  }

  const modelId = uid();
  const diagramType = input.diagramType || "ClassDiagram";
  const cleanTitle = input.title.replace(/\.apollon$/i, "");

  // Specialized Class Diagram builder with automatic grid layout
  if (diagramType === "ClassDiagram" && input.classes && input.classes.length > 0) {
    const nodes: any[] = [];
    const edges: any[] = [];
    const classNameToId = new Map<string, string>();
    const nodeCoords = new Map<string, { x: number; y: number; width: number; height: number }>();

    const cols = input.classes.length > 4 ? 3 : 2;
    const colWidth = 260;
    const xGap = 80;
    const yGap = 80;

    input.classes.forEach((cls, index) => {
      const nodeId = uid();
      classNameToId.set(cls.name.trim().toLowerCase(), nodeId);
      classNameToId.set(cls.name.trim(), nodeId);

      const col = index % cols;
      const row = Math.floor(index / cols);

      const attrCount = cls.attributes?.length || 0;
      const methodCount = cls.methods?.length || 0;
      const calculatedHeight = Math.max(120, 50 + (attrCount * 22) + (methodCount * 22) + 20);
      const width = colWidth;

      const posX = cls.x ?? (80 + col * (colWidth + xGap));
      const posY = cls.y ?? (80 + row * (calculatedHeight + yGap));

      nodeCoords.set(nodeId, { x: posX, y: posY, width, height: calculatedHeight });

      const attributes = (cls.attributes || []).map((attr) => ({
        id: uid(),
        name: attr,
        fillColor: undefined,
      }));

      const methods = (cls.methods || []).map((meth) => ({
        id: uid(),
        name: meth,
        isAbstract: meth.toLowerCase().includes("abstract"),
        fillColor: undefined,
      }));

      nodes.push({
        id: nodeId,
        type: "class",
        position: { x: posX, y: posY },
        width,
        height: calculatedHeight,
        measured: { width, height: calculatedHeight },
        data: {
          name: cls.name,
          stereotype: cls.stereotype,
          isAbstract: cls.isAbstract || false,
          attributes,
          methods,
          fillColor: cls.fillColor || undefined,
          strokeColor: cls.strokeColor || undefined,
        },
      });
    });

    // Build relationship edges
    if (input.relationships && input.relationships.length > 0) {
      input.relationships.forEach((rel) => {
        const sourceId = classNameToId.get(rel.from.trim()) || classNameToId.get(rel.from.trim().toLowerCase()) || rel.from;
        const targetId = classNameToId.get(rel.to.trim()) || classNameToId.get(rel.to.trim().toLowerCase()) || rel.to;

        if (!sourceId || !targetId) return;

        let edgeType = "ClassBidirectional";
        switch (rel.type) {
          case "Inheritance":
            edgeType = "ClassInheritance";
            break;
          case "Aggregation":
            edgeType = "ClassAggregation";
            break;
          case "Composition":
            edgeType = "ClassComposition";
            break;
          case "Unidirectional":
            edgeType = "ClassUnidirectional";
            break;
          case "Dependency":
            edgeType = "ClassDependency";
            break;
          default:
            edgeType = "ClassBidirectional";
        }

        const sourcePos = nodeCoords.get(sourceId) || { x: 100, y: 100, width: 200, height: 120 };
        const targetPos = nodeCoords.get(targetId) || { x: 400, y: 100, width: 200, height: 120 };

        // Choose appropriate connection handles based on relative positions
        let sourceHandle = "right";
        let targetHandle = "left";
        if (targetPos.y > sourcePos.y + 100) {
          sourceHandle = "bottom";
          targetHandle = "top";
        } else if (sourcePos.y > targetPos.y + 100) {
          sourceHandle = "top";
          targetHandle = "bottom";
        }

        const edgeId = uid();
        edges.push({
          id: edgeId,
          type: edgeType,
          source: sourceId,
          target: targetId,
          sourceHandle,
          targetHandle,
          data: {
            name: rel.name || "",
            sourceMultiplicity: rel.sourceMultiplicity || "",
            targetMultiplicity: rel.targetMultiplicity || rel.multiplicity || "",
            points: [
              { x: sourcePos.x + sourcePos.width / 2, y: sourcePos.y + sourcePos.height / 2 },
              { x: targetPos.x + targetPos.width / 2, y: targetPos.y + targetPos.height / 2 },
            ],
          },
        });
      });
    }

    return {
      version: "4.2.0",
      id: modelId,
      title: cleanTitle,
      type: "ClassDiagram",
      nodes,
      edges,
      assessments: {},
    };
  }

  // Generic diagram builder (Activity, Component, Deployment, BPMN, Flowchart, etc.)
  const genericNodes: any[] = [];
  const genericEdges: any[] = [];
  const nodeNameToId = new Map<string, string>();

  if (input.nodes && input.nodes.length > 0) {
    input.nodes.forEach((n, idx) => {
      const nodeId = uid();
      nodeNameToId.set(n.name.trim().toLowerCase(), nodeId);
      nodeNameToId.set(n.name.trim(), nodeId);

      const width = n.width || 180;
      const height = n.height || 90;
      const posX = n.x ?? (100 + (idx % 3) * 260);
      const posY = n.y ?? (100 + Math.floor(idx / 3) * 160);

      let defaultNodeType = "activityActionNode";
      if (diagramType === "ComponentDiagram") defaultNodeType = "component";
      else if (diagramType === "DeploymentDiagram") defaultNodeType = "deploymentNode";
      else if (diagramType === "Flowchart") defaultNodeType = "flowchartProcess";
      else if (diagramType === "BPMN") defaultNodeType = "bpmnTask";
      else if (diagramType === "UseCaseDiagram") defaultNodeType = "useCase";

      genericNodes.push({
        id: nodeId,
        type: n.type || defaultNodeType,
        position: { x: posX, y: posY },
        width,
        height,
        measured: { width, height },
        data: {
          name: n.name,
          fillColor: n.fillColor,
        },
      });
    });
  }

  if (input.edges && input.edges.length > 0) {
    input.edges.forEach((e) => {
      const sourceId = nodeNameToId.get(e.from.trim()) || nodeNameToId.get(e.from.trim().toLowerCase()) || e.from;
      const targetId = nodeNameToId.get(e.to.trim()) || nodeNameToId.get(e.to.trim().toLowerCase()) || e.to;

      if (!sourceId || !targetId) return;

      let defaultEdgeType = "ActivityControlFlow";
      if (diagramType === "ComponentDiagram") defaultEdgeType = "ComponentDependency";
      else if (diagramType === "DeploymentDiagram") defaultEdgeType = "DeploymentAssociation";
      else if (diagramType === "Flowchart") defaultEdgeType = "FlowChartFlowline";
      else if (diagramType === "BPMN") defaultEdgeType = "BPMNSequenceFlow";
      else if (diagramType === "UseCaseDiagram") defaultEdgeType = "UseCaseAssociation";

      genericEdges.push({
        id: uid(),
        type: e.type || defaultEdgeType,
        source: sourceId,
        target: targetId,
        sourceHandle: "right",
        targetHandle: "left",
        data: {
          name: e.name || "",
          points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        },
      });
    });
  }

  return {
    version: "4.2.0",
    id: modelId,
    title: cleanTitle,
    type: diagramType,
    nodes: genericNodes,
    edges: genericEdges,
    assessments: {},
  };
}
