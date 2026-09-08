import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper } from "../wrappers"
import { useMemo, useEffect } from "react"
import { useDiagramStore } from "@tumaet/apollon/store/context"
import { useShallow } from "zustand/shallow"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { DefaultNodeProps } from "@tumaet/apollon/types"
import { SfcJumpNodeSVG } from "@tumaet/apollon/components"
import { measureTextWidth, calculateMinWidth } from "@tumaet/apollon/utils"
import { LAYOUT } from "@tumaet/apollon/constants"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"

export function SfcJump({
  id,
  width,
  height,
  data,
}: NodeProps<Node<DefaultNodeProps>>) {
  const { name } = data || {}
  const [anchorEl, anchorRef] = usePopoverAnchor()

  const { setNodes } = useDiagramStore(
    useShallow((state) => ({
      setNodes: state.setNodes,
    }))
  )

  const fixedHeight = 32 // Fixed height for compact appearance

  const minWidth = useMemo(() => {
    const textWidth = measureTextWidth(name || "", LAYOUT.DEFAULT_FONT) + 8
    return calculateMinWidth(textWidth, LAYOUT.DEFAULT_PADDING) + 12
  }, [name])

  // Auto-expand/shrink width when text changes
  useEffect(() => {
    if (width && width !== minWidth) {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              width: minWidth,
              height: fixedHeight,
              measured: {
                ...node.measured,
                width: minWidth,
                height: fixedHeight,
              },
            }
          }
          return node
        })
      )
    }
  }, [minWidth, width, id, setNodes])

  if (!width || !height) {
    return null
  }

  const finalWidth = Math.max(width, minWidth)
  const finalHeight = fixedHeight

  return (
    <DefaultNodeWrapper width={finalWidth} height={finalHeight} elementId={id}>
      <NodeToolbar elementId={id} />

      <div ref={anchorRef}>
        <SfcJumpNodeSVG
          width={finalWidth}
          height={finalHeight}
          data={data}
          id={id}
        />
      </div>

      <PopoverManager anchorEl={anchorEl} elementId={id} type="default" />
    </DefaultNodeWrapper>
  )
}
