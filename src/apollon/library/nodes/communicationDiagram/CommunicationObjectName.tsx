import { NodeProps, type Node } from "@xyflow/react"
import { usePopoverAnchor } from "@tumaet/apollon/hooks/usePopoverAnchor"
import { DefaultNodeWrapper, NodeResizer } from "@tumaet/apollon/nodes/wrappers"
import { CommunicationObjectNameSVG } from "@tumaet/apollon/components"
import { useEffect, useMemo } from "react"
import { CommunicationObjectNodeProps } from "@tumaet/apollon/types"
import { useDiagramStore } from "@tumaet/apollon/store/context"
import { useShallow } from "zustand/shallow"
import {
  measureTextWidth,
  calculateMinWidth,
  calculateMinHeight,
} from "@tumaet/apollon/utils"
import { LAYOUT } from "@tumaet/apollon/constants"
import { PopoverManager } from "@tumaet/apollon/components/popovers/PopoverManager"
import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { NodeToolbar } from "@tumaet/apollon/components/toolbars/NodeToolbar"

export function CommunicationObjectName({
  id,
  width,
  height,
  data,
}: NodeProps<Node<CommunicationObjectNodeProps>>) {
  const { name, attributes = [], methods = [] } = data
  const { setNodes } = useDiagramStore(
    useShallow((state) => ({
      setNodes: state.setNodes,
    }))
  )
  const isDiagramModifiable = useDiagramModifiable()
  const [anchorEl, anchorRef] = usePopoverAnchor()

  // Communication diagrams don't have stereotypes, so header height is consistent
  const headerHeight = LAYOUT.DEFAULT_HEADER_HEIGHT
  const attributeHeight = LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
  const methodHeight = LAYOUT.DEFAULT_METHOD_HEIGHT
  const padding = LAYOUT.DEFAULT_PADDING
  const font = LAYOUT.DEFAULT_FONT

  // Calculate the widest text accurately
  const maxTextWidth = useMemo(() => {
    const headerTextWidth = measureTextWidth(name, font)
    const attributesTextWidths = attributes.map((attr: { name: string }) =>
      measureTextWidth(attr.name, font)
    )
    const methodsTextWidths = methods.map((method: { name: string }) =>
      measureTextWidth(method.name, font)
    )
    const allTextWidths = [
      headerTextWidth,
      ...attributesTextWidths,
      ...methodsTextWidths,
    ]

    const result = Math.max(...allTextWidths, 0)
    return result
  }, [name, attributes, methods, font])

  const minWidth = useMemo(() => {
    const result = calculateMinWidth(maxTextWidth, padding)
    return result
  }, [maxTextWidth, padding])

  // Calculate minimum dimensions
  const minHeight = useMemo(
    () =>
      calculateMinHeight(
        headerHeight,
        attributes.length,
        methods.length,
        attributeHeight,
        methodHeight
      ),
    [
      headerHeight,
      attributes.length,
      methods.length,
      attributeHeight,
      methodHeight,
    ]
  )

  useEffect(() => {
    if (height && height <= minHeight) {
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

  useEffect(() => {
    if (width && width <= minWidth) {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              width: Math.max(width ?? 0, minWidth),
              measured: {
                width: Math.max(width ?? 0, minWidth),
              },
            }
          }
          return node
        })
      )
    }
  }, [id, setNodes, minWidth])

  const finalWidth = Math.max(width ?? 0, minWidth)

  return (
    <DefaultNodeWrapper width={width} height={height} elementId={id}>
      <NodeToolbar elementId={id} />

      <NodeResizer
        nodeId={id}
        isVisible={isDiagramModifiable}
        minWidth={minWidth}
        minHeight={minHeight}
        maxHeight={minHeight}
      />

      <div ref={anchorRef}>
        <CommunicationObjectNameSVG
          width={finalWidth}
          height={minHeight}
          data={data}
          id={id}
          showAssessmentResults={!isDiagramModifiable}
        />
      </div>
      <PopoverManager
        anchorEl={anchorEl}
        elementId={id}
        type={"communicationObjectName" as const}
      />
    </DefaultNodeWrapper>
  )
}
