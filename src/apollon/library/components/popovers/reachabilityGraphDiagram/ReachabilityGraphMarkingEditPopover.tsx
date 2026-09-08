import { ReachabilityGraphMarkingProps } from "@tumaet/apollon/types"
import { useDiagramStore } from "@tumaet/apollon/store/context"
import { useShallow } from "zustand/shallow"
import { Checkbox } from "@tumaet/apollon/components/ui"
import { PopoverProps } from "../types"
import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverSection } from "../PopoverLayout"
import { useLabels } from "@tumaet/apollon/i18n/useLabels"

export const ReachabilityGraphMarkingEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setNodes: state.setNodes,
    }))
  )

  const toggle = () => {
    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id === elementId) {
          return {
            ...n,
            data: {
              ...n.data,
              isInitialMarking: !n.data.isInitialMarking,
            },
          }
        }
        return n
      })
    )
  }

  const node = nodes.find((node) => node.id === elementId)
  if (!node) {
    return null
  }

  const nodeData = node.data as ReachabilityGraphMarkingProps

  return (
    <DefaultNodeEditPopover elementId={elementId}>
      <PopoverSection divider>
        <Checkbox
          checked={nodeData.isInitialMarking}
          onCheckedChange={toggle}
          label={t.isInitialMarking}
        />
      </PopoverSection>
    </DefaultNodeEditPopover>
  )
}
