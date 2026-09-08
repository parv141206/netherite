import { ClassNodeElement } from "@tumaet/apollon/types"
import { CustomText } from "./CustomText"
import { FC } from "react"
import AssessmentIcon from "../AssessmentIcon"
import { FeedbackDropzone } from "@tumaet/apollon/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableElement } from "@tumaet/apollon/components/AssessmentSelectableElement"
import { getCustomColorsFromData } from "@tumaet/apollon/utils"
import { LAYOUT } from "@tumaet/apollon/constants"

interface RowBlockSectionProps {
  items: (ClassNodeElement & { score?: number })[]
  padding: number
  itemHeight: number
  width: number
  offsetFromTop: number
  showAssessmentResults?: boolean
  itemElementType?: string
}
export const RowBlockSection: FC<RowBlockSectionProps> = ({
  items,
  padding,
  itemHeight,
  offsetFromTop,
  width,
  showAssessmentResults = false,
  itemElementType,
}) => {
  return (
    <g transform={`translate(0, ${offsetFromTop})`}>
      {items.map((item, index) => {
        const y = index * itemHeight
        const iconY = y - 12
        const iconX = width - 15
        const { fillColor, textColor } = getCustomColorsFromData(item)
        return (
          <AssessmentSelectableElement
            key={item.id}
            elementId={item.id}
            width={width}
            itemHeight={itemHeight}
            yOffset={y}
            badge={
              showAssessmentResults && typeof item.score === "number" ? (
                <AssessmentIcon score={item.score} x={iconX} y={iconY} />
              ) : undefined
            }
          >
            <FeedbackDropzone elementId={item.id} elementType={itemElementType}>
              <rect
                x={LAYOUT.LINE_WIDTH / 2}
                y={y + LAYOUT.LINE_WIDTH / 2}
                width={width - LAYOUT.LINE_WIDTH}
                height={itemHeight - LAYOUT.LINE_WIDTH}
                fill={fillColor}
              />
              <CustomText
                x={padding}
                y={15 + index * itemHeight}
                dominantBaseline="central"
                textAnchor="start"
                fill={textColor}
                fontStyle={item.isAbstract ? "italic" : "normal"}
              >
                {item.name}
              </CustomText>
            </FeedbackDropzone>
          </AssessmentSelectableElement>
        )
      })}
    </g>
  )
}
