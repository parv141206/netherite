import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, FOUR_WAY_HANDLES_PRESET } from "../wrappers"
import { DefaultNodeProps } from "@tumaet/apollon/types"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { ComponentInterfaceNodeSVG } from "@tumaet/apollon/components"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"
import { useInterfaceLabelSide } from "@tumaet/apollon/hooks/useInterfaceLabelSide"

export function ComponentInterface({
  id,
  width,
  height,
  data,
}: NodeProps<Node<DefaultNodeProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()
  const showAssessmentResults = !isDiagramModifiable
  // Move the name off any side a connecting edge actually attaches to (read from the
  // routed geometry, not the stored handle). A primitive-returning selector re-renders
  // the node only when the chosen side flips.
  const labelSide = useInterfaceLabelSide(id, {
    badgeTopRight: showAssessmentResults,
  })

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper
      width={width}
      height={height}
      elementId={id}
      hiddenHandles={FOUR_WAY_HANDLES_PRESET}
    >
      <NodeToolbar elementId={id} />

      <div ref={anchorRef}>
        <ComponentInterfaceNodeSVG
          width={width}
          height={height}
          data={data}
          id={id}
          showAssessmentResults={showAssessmentResults}
          labelSide={labelSide}
        />
      </div>

      <PopoverManager anchorEl={anchorEl} elementId={id} type="default" />
    </DefaultNodeWrapper>
  )
}
