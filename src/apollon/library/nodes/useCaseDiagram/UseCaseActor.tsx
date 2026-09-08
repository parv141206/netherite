import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"
import { useHandleOnResize } from "@tumaet/apollon/hooks"
import { DefaultNodeProps } from "@tumaet/apollon/types"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { UseCaseActorNodeSVG } from "@tumaet/apollon/components/svgs/nodes/useCaseDiagram/UseCaseActorNodeSVG"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"

// The actor node IS resizable, but `UseCaseActorNodeSVG` draws the stick
// figure and the label at fixed pixel sizes — resizing grows the node's
// bounding box (giving the label more room to wrap / the figure room to
// breathe) without stretching the iconic figure or the label font.
//
// `minWidth` guarantees the stick figure (90px wide) never clips; `minHeight`
// leaves room for the figure (110px) + a gap + one full label line.
const ACTOR_MIN_WIDTH = 90
const ACTOR_MIN_HEIGHT = 140

export function UseCaseActor({
  id,
  width,
  height,
  data,
  parentId,
}: NodeProps<Node<DefaultNodeProps>>) {
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
        minWidth={ACTOR_MIN_WIDTH}
        minHeight={ACTOR_MIN_HEIGHT}
      />
      <div ref={anchorRef}>
        <UseCaseActorNodeSVG
          width={width}
          height={height}
          data={data}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>

      <PopoverManager anchorEl={anchorEl} elementId={id} type="default" />
    </DefaultNodeWrapper>
  )
}
