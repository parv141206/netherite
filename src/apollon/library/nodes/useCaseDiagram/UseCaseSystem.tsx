import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { useHandleOnResize } from "@tumaet/apollon/hooks"
import { DefaultNodeProps } from "@tumaet/apollon/types"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { UseCaseSystemNodeSVG } from "@tumaet/apollon/components"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"

export function UseCaseSystem({
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
        minHeight={50}
        minWidth={50}
      />
      <div ref={anchorRef}>
        <UseCaseSystemNodeSVG
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
