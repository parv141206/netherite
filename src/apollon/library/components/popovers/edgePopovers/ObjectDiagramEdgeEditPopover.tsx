import { useReactFlow } from "@xyflow/react"
import { useReactiveEdge } from "@tumaet/apollon/hooks"
import { PopoverProps } from "../types"
import { EdgeStyleEditor } from "@tumaet/apollon/components/styleEditor"
import { CustomEdgeProps } from "@tumaet/apollon/edges"
import { useLabels } from "@tumaet/apollon/i18n/useLabels"
import { PopoverLayout } from "../PopoverLayout"

export const ObjectDiagramEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { updateEdgeData } = useReactFlow()
  const edge = useReactiveEdge(elementId)

  if (!edge) {
    return null
  }

  const edgeData = edge.data as CustomEdgeProps | undefined
  return (
    <PopoverLayout title={t.edge}>
      <EdgeStyleEditor
        edgeData={edgeData}
        handleDataFieldUpdate={(key, value) =>
          updateEdgeData(elementId, { ...edge.data, [key]: value })
        }
        label={t.style}
      />
    </PopoverLayout>
  )
}
