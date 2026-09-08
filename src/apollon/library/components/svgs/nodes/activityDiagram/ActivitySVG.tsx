import { LAYOUT } from "@tumaet/apollon/constants"
import { MultilineText, StyledRect } from "@tumaet/apollon/components"
import { useDiagramStore } from "@tumaet/apollon/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@tumaet/apollon/types/SVG"
import { DefaultNodeProps } from "@tumaet/apollon/types"
import { getCustomColorsFromData } from "@tumaet/apollon/utils/layoutUtils"
import { maxLinesForHeight } from "@tumaet/apollon/utils/svgTextLayout"

export type ActivitySVGProps = SVGComponentProps & {
  data: DefaultNodeProps
}

export const ActivitySVG: React.FC<ActivitySVGProps> = ({
  id,
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
}) => {
  const { name } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)
  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <g>
        <StyledRect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={10}
          ry={10}
          fill={fillColor}
          stroke={strokeColor}
        />

        {/* Name Text — anchored near the top edge of the activity
            container; first line center lands at y=22 to match the
            original hanging-baseline placement. Wrapped downward,
            capped to what fits in the node's height. */}
        <MultilineText
          text={name}
          x={width / 2}
          y={22}
          maxWidth={width - 24}
          fontSize={LAYOUT.NAME_FONT_SIZE}
          fontWeight="600"
          fill={textColor}
          verticalAnchor="top"
          maxLines={maxLinesForHeight(height - 28, LAYOUT.NAME_LINE_HEIGHT)}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
