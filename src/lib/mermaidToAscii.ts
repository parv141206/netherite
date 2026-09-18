/**
 * Netherite Mermaid-to-ASCII Converter
 * Converts Mermaid diagram definitions into clean, readable ASCII text box diagrams.
 */

interface NodeInfo {
  id: string;
  label: string;
  shape?: "box" | "round" | "stadium" | "diamond" | "cylinder" | "circle";
}

interface EdgeInfo {
  from: string;
  to: string;
  label?: string;
  style?: "solid" | "dashed" | "thick";
}

interface SequenceMessage {
  from: string;
  to: string;
  text: string;
  isDotted?: boolean;
}

/**
 * Main conversion entry point: parses Mermaid code and renders clean ASCII art
 */
export function mermaidToAscii(code: string): string {
  if (!code || typeof code !== "string" || !code.trim()) {
    return "(Empty diagram)";
  }

  const clean = code.trim();
  const firstLine = clean.split("\n")[0]?.trim().toLowerCase() || "";

  if (firstLine.startsWith("sequencediagram")) {
    return renderSequenceDiagramAscii(clean);
  }

  if (
    firstLine.startsWith("flowchart") ||
    firstLine.startsWith("graph") ||
    firstLine.startsWith("statediagram") ||
    firstLine.startsWith("classdiagram")
  ) {
    return renderGraphOrFlowchartAscii(clean);
  }

  // Generic fallback for any other graph or unspecified syntax
  return renderGraphOrFlowchartAscii(clean);
}

/**
 * Render Sequence Diagrams in ASCII
 */
function renderSequenceDiagramAscii(code: string): string {
  const lines = code.split("\n").map((l) => l.trim()).filter(Boolean);
  const participantsMap = new Map<string, string>();
  const participantOrder: string[] = [];
  const messages: SequenceMessage[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/%%.*$/, "").trim();
    if (!line || line.startsWith("sequenceDiagram") || line.startsWith("autonumber")) {
      continue;
    }

    // Participant / Actor declaration: actor Alice as Robert
    const partMatch = line.match(/^(?:actor|participant)\s+([A-Za-z0-9_\-]+)(?:\s+as\s+(.+))?$/i);
    if (partMatch && partMatch[1]) {
      const id = partMatch[1];
      const name = (partMatch[2] || id).trim();
      if (!participantsMap.has(id)) {
        participantsMap.set(id, name);
        participantOrder.push(id);
      }
      continue;
    }

    // Messages: A->>B: message, A-->>B: message, A->B: message, etc.
    const msgMatch = line.match(
      /^([A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*)\s*(-->>|->>|-->|->|-\)|--\)|--x|->x)\s*([A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*)\s*:\s*(.+)$/
    );
    if (msgMatch && msgMatch[1] && msgMatch[3]) {
      const from = msgMatch[1];
      const arrow = msgMatch[2] || "->";
      const to = msgMatch[3];
      const text = (msgMatch[4] || "").trim();

      if (!participantsMap.has(from)) {
        participantsMap.set(from, from);
        participantOrder.push(from);
      }
      if (!participantsMap.has(to)) {
        participantsMap.set(to, to);
        participantOrder.push(to);
      }

      messages.push({
        from,
        to,
        text,
        isDotted: arrow.includes("--"),
      });
      continue;
    }
  }

  if (participantOrder.length === 0) {
    return "  (No sequence interactions detected)";
  }

  const colWidth = 24;
  const colCenters = participantOrder.map((_, idx) => idx * colWidth + Math.floor(colWidth / 2));

  let output = "";

  // 1. Participant Boxes Top
  let boxTop = "";
  let boxMid = "";
  let boxBot = "";

  for (const id of participantOrder) {
    const name = participantsMap.get(id) || id;
    const boxInnerWidth = colWidth - 6;
    const truncated = name.length > boxInnerWidth ? name.slice(0, boxInnerWidth - 1) + "…" : name;
    const leftPad = Math.floor((boxInnerWidth - truncated.length) / 2);
    const rightPad = boxInnerWidth - truncated.length - leftPad;

    boxTop += "  +" + "-".repeat(boxInnerWidth) + "+  ";
    boxMid += "  |" + " ".repeat(leftPad) + truncated + " ".repeat(rightPad) + "|  ";
    boxBot += "  +" + "-".repeat(boxInnerWidth) + "+  ";
  }

  output += boxTop + "\n" + boxMid + "\n" + boxBot + "\n";

  const renderLifeline = () => {
    let line = "";
    for (let i = 0; i < participantOrder.length; i++) {
      const pad = Math.floor(colWidth / 2);
      line += " ".repeat(pad) + "|" + " ".repeat(colWidth - pad - 1);
    }
    return line + "\n";
  };

  output += renderLifeline();

  // 2. Messages
  for (const msg of messages) {
    const fromIdx = participantOrder.indexOf(msg.from);
    const toIdx = participantOrder.indexOf(msg.to);

    if (fromIdx === -1 || toIdx === -1) continue;

    if (fromIdx === toIdx) {
      // Self call
      const center = colCenters[fromIdx] ?? 0;
      let line1 = "";
      for (let i = 0; i < participantOrder.length; i++) {
        const pad = Math.floor(colWidth / 2);
        line1 += " ".repeat(pad) + "|" + " ".repeat(colWidth - pad - 1);
      }
      const selfArrow = "--- " + msg.text + " ---+";
      const selfReturn = "<--------------------+";
      output += line1.slice(0, center + 1) + selfArrow + "\n";
      output += line1.slice(0, center + 1) + selfReturn + "\n";
      output += renderLifeline();
      continue;
    }

    const startX = colCenters[Math.min(fromIdx, toIdx)] ?? 0;
    const endX = colCenters[Math.max(fromIdx, toIdx)] ?? 0;
    const isLeftToRight = fromIdx < toIdx;
    const distance = endX - startX;

    // Truncate text if too long
    const maxTextLen = Math.max(0, distance - 8);
    let label = msg.text;
    if (label.length > maxTextLen) {
      label = label.slice(0, Math.max(0, maxTextLen - 1)) + "…";
    }

    const padTotal = Math.max(0, distance - label.length - 4);
    const padLeft = Math.floor(padTotal / 2);
    const padRight = padTotal - padLeft;
    const dashChar = msg.isDotted ? "-" : "-";

    let arrowBody = "";
    if (isLeftToRight) {
      arrowBody = dashChar.repeat(padLeft) + " " + label + " " + dashChar.repeat(padRight) + ">";
    } else {
      arrowBody = "<" + dashChar.repeat(padLeft) + " " + label + " " + dashChar.repeat(padRight);
    }

    // Construct full row with other lifelines
    let row = "";
    for (let i = 0; i < participantOrder.length; i++) {
      const center = colCenters[i] ?? 0;
      while (row.length < center) row += " ";
      if (row.length === center) {
        row += "|";
      }
    }

    // Splice in arrow between startX and endX
    const before = row.slice(0, startX + 1);
    const after = row.slice(endX);
    const formattedRow = before + arrowBody.padEnd(distance - 1, dashChar) + after;

    output += formattedRow + "\n";
    output += renderLifeline();
  }

  // 3. Participant Boxes Bottom
  output += boxTop + "\n" + boxMid + "\n" + boxBot + "\n";
  return output;
}

/**
 * Parse and render Flowcharts, State Diagrams, and Class Diagrams
 */
function renderGraphOrFlowchartAscii(code: string): string {
  const lines = code.split("\n").map((l) => l.trim()).filter(Boolean);
  const isLeftToRight = /^\s*(flowchart|graph)\s+LR\b/i.test(lines[0] || "");

  const nodes = new Map<string, NodeInfo>();
  const edges: EdgeInfo[] = [];

  const getNodeOrCreate = (id: string, defaultLabel?: string): NodeInfo => {
    const cleanId = id.trim();
    if (!nodes.has(cleanId)) {
      nodes.set(cleanId, {
        id: cleanId,
        label: defaultLabel || cleanId,
        shape: "box",
      });
    }
    return nodes.get(cleanId)!;
  };

  const extractNodeDef = (str: string): { id: string; label: string; shape: NodeInfo["shape"] } | null => {
    const match = str.match(/^([A-Za-z0-9_\-]+)\s*(?:\[\((.+?)\)\]|\(\[(.+?)\]\)|\(\((.+?)\)\)|\[(.+?)\]|\((.+?)\)|\{(.+?)\})?$/);
    if (!match) return null;
    const id = match[1] || "";
    let label = id;
    let shape: NodeInfo["shape"] = "box";

    if (match[2]) {
      label = match[2];
      shape = "cylinder";
    } else if (match[3]) {
      label = match[3];
      shape = "stadium";
    } else if (match[4]) {
      label = match[4];
      shape = "circle";
    } else if (match[5]) {
      label = match[5];
      shape = "box";
    } else if (match[6]) {
      label = match[6];
      shape = "round";
    } else if (match[7]) {
      label = match[7];
      shape = "diamond";
    }

    return { id, label: label.trim(), shape };
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/%%.*$/, "").trim();
    if (
      !line ||
      line.startsWith("flowchart") ||
      line.startsWith("graph") ||
      line.startsWith("subgraph") ||
      line.startsWith("end") ||
      line.startsWith("classDiagram") ||
      line.startsWith("stateDiagram")
    ) {
      continue;
    }

    const tokens = line.split(/\s*(-->|---|-.->|==>|--\s*.*?\s*-->)\s*/);

    if (tokens.length >= 3) {
      let currentLeft = tokens[0] || "";
      for (let i = 1; i < tokens.length; i += 2) {
        const arrowToken = tokens[i] || "-->";
        const rightToken = tokens[i + 1] || "";

        let edgeLabel: string | undefined = undefined;
        const labelInArrow = arrowToken.match(/--\s*(.+?)\s*-->/);
        if (labelInArrow) {
          edgeLabel = labelInArrow[1]?.trim();
        }

        const pipeLabel = rightToken.match(/^\|(.+?)\|\s*(.*)$/);
        let actualRight = rightToken;
        if (pipeLabel) {
          edgeLabel = pipeLabel[1]?.trim();
          actualRight = pipeLabel[2] || "";
        }

        const leftParsed = extractNodeDef(currentLeft);
        const rightParsed = extractNodeDef(actualRight);

        if (leftParsed) {
          const nodeA = getNodeOrCreate(leftParsed.id, leftParsed.label);
          nodeA.shape = leftParsed.shape;
          nodeA.label = leftParsed.label;
        }

        if (rightParsed) {
          const nodeB = getNodeOrCreate(rightParsed.id, rightParsed.label);
          nodeB.shape = rightParsed.shape;
          nodeB.label = rightParsed.label;
        }

        if (leftParsed && rightParsed) {
          edges.push({
            from: leftParsed.id,
            to: rightParsed.id,
            label: edgeLabel,
            style: arrowToken.includes("-.-") ? "dashed" : arrowToken.includes("==") ? "thick" : "solid",
          });
        }

        currentLeft = actualRight;
      }
      continue;
    }

    const solo = extractNodeDef(line);
    if (solo) {
      const node = getNodeOrCreate(solo.id, solo.label);
      node.shape = solo.shape;
      node.label = solo.label;
    }
  }

  if (nodes.size === 0) {
    return "  (No flowchart nodes detected)";
  }

  if (isLeftToRight) {
    return renderHorizontalFlowchart(Array.from(nodes.values()), edges);
  }

  return renderVerticalFlowchart(Array.from(nodes.values()), edges);
}

function makeAsciiBox(text: string, shape?: NodeInfo["shape"]): string[] {
  const padding = 2;
  const content = text.trim();
  const width = Math.max(content.length + padding * 2, 8);
  const padLeft = Math.floor((width - content.length) / 2);
  const padRight = width - content.length - padLeft;

  let top = "+" + "-".repeat(width) + "+";
  let mid = "|" + " ".repeat(padLeft) + content + " ".repeat(padRight) + "|";
  let bot = "+" + "-".repeat(width) + "+";

  if (shape === "round" || shape === "stadium") {
    top = " (" + "-".repeat(width - 2) + ") ";
    mid = "( " + " ".repeat(padLeft - 1) + content + " ".repeat(padRight - 1) + " )";
    bot = " (" + "-".repeat(width - 2) + ") ";
  } else if (shape === "diamond") {
    top = " /" + "-".repeat(width - 2) + "\\ ";
    mid = "< " + " ".repeat(padLeft - 1) + content + " ".repeat(padRight - 1) + " >";
    bot = " \\" + "-".repeat(width - 2) + "/ ";
  } else if (shape === "cylinder") {
    top = " [" + "=".repeat(width - 2) + "] ";
    mid = " |" + " ".repeat(padLeft - 1) + content + " ".repeat(padRight - 1) + "| ";
    bot = " [" + "=".repeat(width - 2) + "] ";
  }

  return [top, mid, bot];
}

function renderVerticalFlowchart(nodes: NodeInfo[], edges: EdgeInfo[]): string {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }

  for (const e of edges) {
    if (inDegree.has(e.to)) {
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    }
    if (adj.has(e.from)) {
      adj.get(e.from)!.push(e.to);
    }
  }

  const layers: NodeInfo[][] = [];
  const visited = new Set<string>();

  let currentLayer = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0);
  if (currentLayer.length === 0 && nodes.length > 0) {
    const firstNode = nodes[0];
    if (firstNode) currentLayer = [firstNode];
  }

  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    currentLayer.forEach((n) => visited.add(n.id));

    const nextLayerSet = new Set<string>();
    for (const n of currentLayer) {
      for (const neighbor of adj.get(n.id) || []) {
        if (!visited.has(neighbor)) {
          nextLayerSet.add(neighbor);
        }
      }
    }

    currentLayer = nodes.filter((n) => nextLayerSet.has(n.id));
  }

  const unreached = nodes.filter((n) => !visited.has(n.id));
  if (unreached.length > 0) {
    layers.push(unreached);
  }

  let output = "";

  for (let l = 0; l < layers.length; l++) {
    const layer = layers[l];
    if (!layer || layer.length === 0) continue;

    const renderedBoxes = layer.map((node) => makeAsciiBox(node.label, node.shape));

    for (let row = 0; row < 3; row++) {
      let line = "  ";
      for (let i = 0; i < renderedBoxes.length; i++) {
        line += (renderedBoxes[i]?.[row] ?? "") + "    ";
      }
      output += line.trimEnd() + "\n";
    }

    if (l < layers.length - 1) {
      const nextLayer = layers[l + 1] || [];
      const layerEdges = edges.filter((e) =>
        layer.some((src) => src.id === e.from) && nextLayer.some((dst) => dst.id === e.to)
      );

      if (layer.length === 1 && nextLayer.length === 1) {
        const edge = layerEdges[0];
        const label = edge?.label ? ` (${edge.label})` : "";
        const midWidth = Math.floor(((renderedBoxes[0]?.[0] ?? "").length) / 2);
        const pad = " ".repeat(Math.max(2, midWidth + 1));
        output += pad + "|" + label + "\n";
        output += pad + "v\n";
      } else if (layer.length === 1 && nextLayer.length > 1) {
        const midWidth = Math.floor(((renderedBoxes[0]?.[0] ?? "").length) / 2);
        const pad = " ".repeat(Math.max(2, midWidth + 1));
        output += pad + "|\n";
        output += "  " + "+".padStart(midWidth, "-") + "-".repeat(nextLayer.length * 14) + "+\n";

        let arrowRow = "  ";
        for (let idx = 0; idx < nextLayer.length; idx++) {
          const edge = layerEdges.find((e) => e.to === nextLayer[idx]?.id);
          const lbl = edge?.label ? `(${edge.label})` : "  v  ";
          arrowRow += lbl.padEnd(16, " ");
        }
        output += arrowRow.trimEnd() + "\n";
      } else {
        output += "       |\n";
        output += "       v\n";
      }
    }
  }

  return output;
}

function renderHorizontalFlowchart(nodes: NodeInfo[], edges: EdgeInfo[]): string {
  const boxes = nodes.map((n) => makeAsciiBox(n.label, n.shape));
  let output = "";

  for (let row = 0; row < 3; row++) {
    let line = "  ";
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      const boxRow = boxes[i]?.[row] ?? "";
      line += boxRow;

      if (i < nodes.length - 1) {
        const nextNode = nodes[i + 1];
        const edge = edges.find((e) => e.from === node.id && e.to === nextNode?.id);
        const label = edge?.label ? ` ${edge.label} ` : "";

        if (row === 1) {
          line += ` ---${label}---> `;
        } else {
          line += " ".repeat(8 + label.length);
        }
      }
    }
    output += line.trimEnd() + "\n";
  }

  return output;
}
