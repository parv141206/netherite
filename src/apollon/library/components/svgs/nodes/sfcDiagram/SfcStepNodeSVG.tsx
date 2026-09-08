import { LAYOUT } from "@tumaet/apollon/constants"
import { MultilineText, StyledRect } from "@tumaet/apollon/components"
import { maxLinesForHeight } from "@tumaet/apollon/utils/svgTextLayout"
import { useDiagramStore } from "@tumaet/apollon/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@tumaet/apollon/types/SVG"
import { DefaultNodeProps } from "@tumaet/apollon/types"
import { getCustomColorsFromData } from "@tumaet/apollon/utils/layoutUtils"

interface Props extends SVGComponentProps {
  data: DefaultNodeProps
}

export const SfcStepNodeSVG: React.FC<Props> = ({
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
          fill={fillColor}
          stroke={strokeColor}
        />
        <MultilineText
          text={name}
          x={width / 2}
          y={height / 2}
          maxWidth={width - 16}
          fontSize={LAYOUT.NAME_FONT_SIZE}
          fontWeight="600"
          fill={textColor}
          maxLines={maxLinesForHeight(height - 16, LAYOUT.NAME_LINE_HEIGHT)}
        />
      </g>
      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
