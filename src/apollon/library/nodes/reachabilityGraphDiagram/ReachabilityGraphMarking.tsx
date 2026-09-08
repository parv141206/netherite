import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"
import { useHandleOnResize } from "@tumaet/apollon/hooks"
import { ReachabilityGraphMarkingProps } from "@tumaet/apollon/types"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { ReachabilityGraphMarkingSVG } from "@tumaet/apollon/components/svgs/nodes/reachabilityGraphDiagram/ReachabilityGraphMarkingSVG"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"

export function ReachabilityGraphMarking({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<ReachabilityGraphMarkingProps>>) {
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
        minWidth={50}
      />
      <div ref={anchorRef}>
        <ReachabilityGraphMarkingSVG
          width={width}
          height={height}
          data={data}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>

      <PopoverManager
        anchorEl={anchorEl}
        elementId={id}
        type="ReachabilityGraphMarking"
      />
    </DefaultNodeWrapper>
  )
}
