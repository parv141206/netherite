import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, FOUR_WAY_HANDLES_PRESET } from "../wrappers"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { BPMNEventProps } from "@tumaet/apollon/types"
import { BPMNEventNodeSVG } from "@tumaet/apollon/components"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"

export function BPMNStartEvent({
  id,
  width = 40,
  height = 40,
  data,
}: NodeProps<Node<BPMNEventProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={FOUR_WAY_HANDLES_PRESET}
    >
      <NodeToolbar elementId={id} />

      <div ref={anchorRef}>
        <BPMNEventNodeSVG
          width={width}
          height={height}
          id={id}
          variant="start"
          data={data}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>
      <PopoverManager
        anchorEl={anchorEl}
        elementId={id}
        type="BPMNStartEvent"
      />
    </DefaultNodeWrapper>
  )
}
