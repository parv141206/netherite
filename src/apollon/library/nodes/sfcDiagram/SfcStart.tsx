import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper } from "../wrappers"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { DefaultNodeProps } from "@tumaet/apollon/types"
import { SfcStartNodeSVG } from "@tumaet/apollon/components"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"

export function SfcStart({
  id,
  width,
  height,
  data,
}: NodeProps<Node<DefaultNodeProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper width={width} height={height} elementId={id}>
      <NodeToolbar elementId={id} showEdit={false} />

      <div ref={anchorRef}>
        <SfcStartNodeSVG
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
