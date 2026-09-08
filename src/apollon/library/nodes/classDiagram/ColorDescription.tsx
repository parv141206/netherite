import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"
import { ColorDescriptionSVG } from "@tumaet/apollon/components"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"
import { DefaultNodeProps } from "@tumaet/apollon/types"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"

export function ColorDescription({
  width,
  height,
  data,
  id,
}: NodeProps<Node<DefaultNodeProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()
  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={true}
    >
      <NodeToolbar elementId={id} />
      <NodeResizer minHeight={40} isVisible={isDiagramModifiable} />

      <div ref={anchorRef}>
        <ColorDescriptionSVG data={data} width={width} height={height} />
      </div>
      <PopoverManager elementId={id} type="default" anchorEl={anchorEl} />
    </DefaultNodeWrapper>
  )
}
