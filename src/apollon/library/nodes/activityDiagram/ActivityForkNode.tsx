import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, HandleId, NodeResizer } from "../wrappers"
import { useHandleOnResize } from "@tumaet/apollon/hooks"
import { DefaultNodeProps } from "@tumaet/apollon/types"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { ActivityForkNodeSVG } from "@tumaet/apollon/components/svgs/nodes"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"

export function ActivityForkNode({
  id,
  width,
  height,
  parentId,
  data,
}: NodeProps<Node<DefaultNodeProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const { onResize } = useHandleOnResize(parentId)
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={[
        HandleId.TopLeft,
        HandleId.TopRight,
        HandleId.BottomLeft,
        HandleId.BottomRight,
      ]}
    >
      <NodeToolbar elementId={id} />
      <NodeResizer
        isVisible={isDiagramModifiable}
        onResize={onResize}
        minWidth={20}
        maxWidth={20}
      />
      <div ref={anchorRef}>
        <ActivityForkNodeSVG
          width={width}
          height={height}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
          data={data}
        />
      </div>

      <PopoverManager anchorEl={anchorEl} elementId={id} type="default" />
    </DefaultNodeWrapper>
  )
}
