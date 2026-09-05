import type { EngineeringSymbolDefinition } from "./types";

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SymbolPreview({
  definition,
}: {
  definition: EngineeringSymbolDefinition;
}) {
  const id = definition.id;
  const filled = { ...common, fill: definition.backgroundColor };

  if (id === "flow-decision") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <path {...filled} d="m36 5 29 18-29 18L7 23 36 5Z" />
      </svg>
    );
  }
  if (id === "flow-io") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <path {...filled} d="M17 7h49L55 39H6L17 7Z" />
      </svg>
    );
  }
  if (id === "flow-terminal") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <rect {...filled} x="7" y="9" width="58" height="28" rx="14" />
      </svg>
    );
  }
  if (id === "flow-connector") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <circle {...filled} cx="36" cy="23" r="16" />
      </svg>
    );
  }
  if (id === "function-database") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <g {...common}>
          <path
            fill={definition.backgroundColor}
            d="M14 11c0-5 10-8 22-8s22 3 22 8v25c0 5-10 8-22 8s-22-3-22-8V11Z"
          />
          <ellipse fill="#fff" cx="36" cy="11" rx="22" ry="8" />
        </g>
      </svg>
    );
  }
  if (id === "function-component") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <g {...common}>
          <rect
            fill={definition.backgroundColor}
            x="16"
            y="5"
            width="50"
            height="36"
          />
          <rect fill="#fff" x="6" y="12" width="18" height="8" />
          <rect fill="#fff" x="6" y="27" width="18" height="8" />
        </g>
      </svg>
    );
  }
  if (id === "function-queue") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <g {...common}>
          <rect
            fill={definition.backgroundColor}
            x="6"
            y="8"
            width="60"
            height="30"
            rx="12"
          />
          <path d="M15 15h42M15 31h42" />
        </g>
      </svg>
    );
  }
  if (id === "dfd-store") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <g {...common}>
          <path d="M5 11h62v24H5M19 11v24" />
          <text x="8" y="27" stroke="none" fill="currentColor" fontSize="8">
            D
          </text>
        </g>
      </svg>
    );
  }
  if (id === "dfd-process") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <g {...common}>
          <rect
            fill={definition.backgroundColor}
            x="8"
            y="5"
            width="56"
            height="36"
            rx="9"
          />
          <path d="M8 16h56" />
        </g>
      </svg>
    );
  }
  if (id === "dfd-flow") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <g {...common}>
          <path d="M6 23h56" />
          <path d="m54 16 8 7-8 7" />
        </g>
      </svg>
    );
  }
  if (id === "uml-class" || id === "uml-interface") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <g {...common}>
          <rect
            fill={definition.backgroundColor}
            x="12"
            y="3"
            width="48"
            height="40"
          />
          <path d="M12 15h48M12 28h48" />
        </g>
      </svg>
    );
  }
  if (id === "uml-package") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <path {...filled} d="M7 13V5h24l7 8h27v28H7V13Z" />
      </svg>
    );
  }

  if (id === "ml-tensor") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <g {...common}>
          <rect
            fill={definition.backgroundColor}
            x="8"
            y="4"
            width="56"
            height="38"
          />
          <path d="M8 17h56M8 29h56M27 17v25M46 17v25" />
        </g>
      </svg>
    );
  }
  if (id === "ml-pipeline-group") {
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <rect
          {...common}
          x="6"
          y="5"
          width="60"
          height="36"
          rx="8"
          strokeDasharray="4 3"
        />
        <path {...common} d="M15 23h12m7 0h12m7 0h5m-3-3 3 3-3 3" />
      </svg>
    );
  }
  if (id.startsWith("ml-")) {
    const dark = id === "ml-attention";
    return (
      <svg viewBox="0 0 72 46" aria-hidden="true">
        <rect
          {...common}
          fill={definition.backgroundColor}
          x="7"
          y={id === "ml-stage" ? 4 : 9}
          width="58"
          height={id === "ml-stage" ? 38 : 28}
          rx="8"
        />
        <text
          x="36"
          y="26"
          textAnchor="middle"
          fill={dark ? "#fff" : "currentColor"}
          fontSize="8"
          fontFamily="monospace"
        >
          {definition.glyph}
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 72 46" aria-hidden="true">
      <rect
        {...common}
        fill={definition.backgroundColor}
        x="7"
        y="7"
        width="58"
        height="32"
        rx={definition.rounded ? 9 : 0}
      />
      <text
        x="36"
        y="26"
        textAnchor="middle"
        fill="currentColor"
        fontSize="9"
        fontFamily="monospace"
      >
        {definition.glyph}
      </text>
    </svg>
  );
}
