import { NodeStyleEditor } from "@tumaet/apollon/components/styleEditor"
import { useReactiveNode } from "@tumaet/apollon/hooks"
import { useReactFlow } from "@xyflow/react"
import { PopoverProps } from "../types"
import { BPMNPoolProps } from "@tumaet/apollon/types"
import { supportsMultilineName } from "@tumaet/apollon/utils/nodeUtils"
import { useLabels } from "@tumaet/apollon/i18n/useLabels"
import { PopoverLayout } from "../PopoverLayout"

export const BPMNPoolEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const t = useLabels()
  const { updateNodeData } = useReactFlow()
  const node = useReactiveNode(elementId)
  if (!node) return null

  const data = node.data as BPMNPoolProps

  const handleDataFieldUpdate = (key: string, value: string) => {
    updateNodeData(elementId, { [key]: value })
  }

  return (
    <PopoverLayout title={t.pool}>
      <NodeStyleEditor
        handleDataFieldUpdate={(key, value) =>
          handleDataFieldUpdate(key, value)
        }
        nodeData={data}
        isMultilineName={supportsMultilineName(node.type)}
      />
    </PopoverLayout>
  )
}
