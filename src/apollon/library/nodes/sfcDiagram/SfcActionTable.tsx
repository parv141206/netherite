import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "../wrappers"
import { useMemo, useEffect } from "react"
import { useDiagramStore } from "@tumaet/apollon/store/context"
import { useShallow } from "zustand/shallow"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { SfcActionTableProps } from "@tumaet/apollon/types"
import { SfcActionTableNodeSVG } from "@tumaet/apollon/components"
import { LAYOUT } from "@tumaet/apollon/constants"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"

export function SfcActionTable({
  id,
  width,
  height,
  data,
}: NodeProps<Node<SfcActionTableProps>>) {
  const [anchorEl, anchorRef] = usePopoverAnchor()
  const isDiagramModifiable = useDiagramModifiable()

  const { setNodes } = useDiagramStore(
    useShallow((state) => ({
      setNodes: state.setNodes,
    }))
  )

  const actionRows = data?.actionRows || []

  const minHeight = useMemo(() => {
    const rowsHeight = actionRows.length * LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
    return Math.max(rowsHeight, LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT)
  }, [actionRows.length])

  // Auto-expand height when content changes (like class diagram)
  useEffect(() => {
    if (height && height < minHeight) {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              height: minHeight,
              measured: {
                ...node.measured,
                height: minHeight,
              },
            }
          }
          return node
        })
      )
    }
  }, [minHeight, height, id, setNodes])

  if (!width || !height) {
    return null
  }

  return (
    <DefaultNodeWrapper width={width} height={height} elementId={id}>
      <NodeToolbar elementId={id} />

      <NodeResizer
        nodeId={id}
        isVisible={isDiagramModifiable}
        minWidth={120}
        minHeight={minHeight}
        maxHeight={minHeight}
      />

      <div ref={anchorRef}>
        <SfcActionTableNodeSVG
          width={width}
          height={minHeight}
          id={id}
          data={data}
        />
      </div>

      <PopoverManager
        anchorEl={anchorEl}
        elementId={id}
        type="SfcActionTable"
      />
    </DefaultNodeWrapper>
  )
}
