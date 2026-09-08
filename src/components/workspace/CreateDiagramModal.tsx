"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Plus,
  Network,
  Boxes,
  Activity,
  Workflow,
  Server,
  Layers,
  Search,
  Check,
  GitFork,
  Binary,
  Code2,
  Users,
  Compass,
  ArrowRight,
} from "lucide-react";
import { UMLDiagramType } from "@tumaet/apollon";

export interface DiagramTypeDefinition {
  type: UMLDiagramType;
  name: string;
  category: "Structure" | "Behavior & Workflow" | "Formal Systems";
  badge: string;
  description: string;
  icon: React.ElementType;
}

export const DIAGRAM_DEFINITIONS: DiagramTypeDefinition[] = [
  // Structure
  {
    type: UMLDiagramType.ClassDiagram,
    name: "Class Diagram",
    category: "Structure",
    badge: "UML Structural",
    description: "Classes, abstract classes, interfaces, enumerations, packages, and inheritance.",
    icon: Boxes,
  },
  {
    type: UMLDiagramType.ObjectDiagram,
    name: "Object Diagram",
    category: "Structure",
    badge: "UML Structural",
    description: "Object instances, runtime data values, states, and snapshot links.",
    icon: Boxes,
  },
  {
    type: UMLDiagramType.ComponentDiagram,
    name: "Component Diagram",
    category: "Structure",
    badge: "UML Architecture",
    description: "Modular software components, subsystems, and interface ball-and-socket wiring.",
    icon: Layers,
  },
  {
    type: UMLDiagramType.DeploymentDiagram,
    name: "Deployment Diagram",
    category: "Structure",
    badge: "UML Infrastructure",
    description: "Physical execution environments, servers, network nodes, and deployable artifacts.",
    icon: Server,
  },

  // Behavior & Workflow
  {
    type: UMLDiagramType.ActivityDiagram,
    name: "Activity Diagram",
    category: "Behavior & Workflow",
    badge: "UML Behavioral",
    description: "Control workflows, action steps, decision diamonds, forks, joins, and swimlanes.",
    icon: Activity,
  },
  {
    type: UMLDiagramType.UseCaseDiagram,
    name: "Use Case Diagram",
    category: "Behavior & Workflow",
    badge: "UML Behavioral",
    description: "Actors, use case boundaries, include/extend flows, and system scope.",
    icon: Users,
  },
  {
    type: UMLDiagramType.CommunicationDiagram,
    name: "Communication Diagram",
    category: "Behavior & Workflow",
    badge: "UML Interaction",
    description: "Collaborating objects exchanging numbered messages across time and links.",
    icon: Network,
  },
  {
    type: UMLDiagramType.Flowchart,
    name: "Flowchart",
    category: "Behavior & Workflow",
    badge: "Process Flow",
    description: "Algorithmic decision paths, input/output terminals, processes, and subroutines.",
    icon: GitFork,
  },
  {
    type: UMLDiagramType.BPMN,
    name: "BPMN 2.0 Process",
    category: "Behavior & Workflow",
    badge: "Business Process",
    description: "Business process model with pools, swimlanes, start/end events, gateways, and tasks.",
    icon: Workflow,
  },

  // Formal Systems
  {
    type: UMLDiagramType.PetriNet,
    name: "Petri Net",
    category: "Formal Systems",
    badge: "Formal Model",
    description: "Mathematical modeling of distributed systems with places, transitions, and token flow.",
    icon: Binary,
  },
  {
    type: UMLDiagramType.ReachabilityGraph,
    name: "Reachability Graph",
    category: "Formal Systems",
    badge: "Formal Verification",
    description: "State-space exploration graphs and marking reachability networks for concurrency.",
    icon: Compass,
  },
  {
    type: UMLDiagramType.Sfc,
    name: "SFC (Sequential Function)",
    category: "Formal Systems",
    badge: "Automation Control",
    description: "Sequential Function Chart with steps, transition logic, and action tables.",
    icon: Layers,
  },
  {
    type: UMLDiagramType.SyntaxTree,
    name: "Syntax Tree",
    category: "Formal Systems",
    badge: "Language Grammar",
    description: "Hierarchical parse trees with non-terminal and terminal grammar symbols.",
    icon: Code2,
  },
];

interface CreateDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (diagramType: UMLDiagramType, name: string) => void;
}

export function CreateDiagramModal({
  isOpen,
  onClose,
  onCreate,
}: CreateDiagramModalProps) {
  const [selectedType, setSelectedType] = useState<UMLDiagramType>(UMLDiagramType.ClassDiagram);
  const [diagramName, setDiagramName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filteredDiagrams = useMemo(() => {
    return DIAGRAM_DEFINITIONS.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;
      const matchesQuery =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.badge.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  const handleSelectType = (type: UMLDiagramType, defaultTitle: string) => {
    setSelectedType(type);
    if (!diagramName || diagramName.trim() === "" || DIAGRAM_DEFINITIONS.some(d => d.name === diagramName)) {
      setDiagramName(defaultTitle);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalTitle = diagramName.trim() || DIAGRAM_DEFINITIONS.find((d) => d.type === selectedType)?.name || "Diagram";
    onCreate(selectedType, finalTitle);
    onClose();
  };

  const selectedDef = DIAGRAM_DEFINITIONS.find((d) => d.type === selectedType) || DIAGRAM_DEFINITIONS[0]!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-foreground/5 border border-border/80 text-foreground">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Create Architecture & UML Diagram
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select from 13 comprehensive structural, behavioral, and formal modeling diagram suites
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-6 py-3 border-b border-border/50 bg-muted/30 flex items-center justify-between gap-3 flex-wrap shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center p-1 bg-background/80 border border-border/60 rounded-xl text-xs shadow-2xs">
            {["All", "Structure", "Behavior & Workflow", "Formal Systems"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Filter Input */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search diagram types..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background/80 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
        </div>

        {/* Diagram Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDiagrams.map((diag) => {
              const isSelected = selectedType === diag.type;
              const IconComponent = diag.icon;

              return (
                <div
                  key={diag.type}
                  onClick={() => handleSelectType(diag.type, diag.name)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group select-none ${
                    isSelected
                      ? "bg-accent/40 border-foreground/50 ring-1 ring-foreground/20 shadow-xs"
                      : "bg-card hover:bg-muted/30 border-border/60 hover:border-border"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg transition-colors ${
                            isSelected
                              ? "bg-foreground text-background"
                              : "bg-muted/70 text-foreground group-hover:bg-muted"
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs text-foreground">
                          {diag.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground shrink-0">
                        {diag.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {diag.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground/70 font-mono">
                      {diag.category}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Check className="w-3 h-3 text-emerald-500" /> Selected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDiagrams.length === 0 && (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-center">
              <Search className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-xs font-semibold text-foreground">No matching diagram types</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Try searching for "activity", "class", "flowchart", or "BPMN"
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer (Name Input & Action) */}
        <form
          onSubmit={handleSubmit}
          className="px-6 py-3.5 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-4 flex-wrap shrink-0"
        >
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              Diagram Title:
            </span>
            <input
              type="text"
              value={diagramName}
              onChange={(e) => setDiagramName(e.target.value)}
              placeholder={selectedDef.name}
              className="flex-1 px-3 py-1.5 text-xs bg-background border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground font-medium"
            />
            <span className="text-[11px] font-mono text-muted-foreground/60 shrink-0">
              .apollon
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-border/70 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Create {selectedDef.name}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
