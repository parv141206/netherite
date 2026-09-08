import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"
import { DefaultNodeProps } from "@tumaet/apollon/types"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { DeploymentArtifactSVG } from "@tumaet/apollon/components"
import { useHandleOnResize } from "@tumaet/apollon/hooks"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"

export function DeploymentArtifact({
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
        <DeploymentArtifactSVG
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
