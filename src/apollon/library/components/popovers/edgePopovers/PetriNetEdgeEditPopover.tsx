import { IconButton, TextField } from "@tumaet/apollon/components/ui"
import { EdgeStyleEditor } from "@tumaet/apollon/components/styleEditor"
import { useReactFlow } from "@xyflow/react"
import { CustomEdgeProps } from "@tumaet/apollon/edges/EdgeProps"
import { ArrowLeftRight } from "lucide-react"
import { useEdgePopOver, useReactiveEdge } from "@tumaet/apollon/hooks"
import { PopoverProps } from "../types"
import { useLabels } from "@tumaet/apollon/i18n/useLabels"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

export const PetriNetEdgeEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { updateEdgeData } = useReactFlow()
  const edge = useReactiveEdge(elementId)

  const { handleLabelChange, handleSwap } = useEdgePopOver(elementId)

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
        sideElements={[
          handleSwap && (
            <IconButton
              key="swap-source-target"
              ariaLabel={t.swapSourceTarget}
              tooltip={t.swapSourceTarget}
              onClick={handleSwap}
            >
              <ArrowLeftRight width={16} height={16} aria-hidden="true" />
            </IconButton>
          ),
        ]}
      />

      <PopoverSection title={t.weight} divider>
        <TextField
          value={edgeData?.label ?? ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder={t.weight}
          fullWidth
        />
      </PopoverSection>
    </PopoverLayout>
  )
}
