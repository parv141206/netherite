import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"
import { useHandleOnResize } from "@tumaet/apollon/hooks"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { BPMNDataObjectProps } from "@tumaet/apollon/types"
import { BPMNDataObjectNodeSVG } from "@tumaet/apollon/components"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"

export function BPMNDataObject({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<BPMNDataObjectProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const { onResize } = useHandleOnResize(parentId)
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper width={width} height={height} elementId={id}>
      <NodeToolbar elementId={id} />

      <NodeResizer
        isVisible={isDiagramModifiable}
        onResize={onResize}
        minHeight={50}
        minWidth={60}
      />
      <div ref={anchorRef}>
        <BPMNDataObjectNodeSVG
          width={width}
          height={height}
          id={id}
          data={data}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>
      <PopoverManager
        anchorEl={anchorEl}
        elementId={id}
        type="BPMNDataObject"
      />
    </DefaultNodeWrapper>
  )
}
