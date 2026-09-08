import { useDiagramModifiable } from "@tumaet/apollon/hooks/useDiagramModifiable"
import { useHandleDelete } from "@tumaet/apollon/hooks/useHandleDelete"
import { useIsOnlyThisElementSelected } from "@tumaet/apollon/hooks/useIsOnlyThisElementSelected"
import { usePopoverStore } from "@tumaet/apollon/store"
import { ButtonGroup, IconButton } from "@tumaet/apollon/components/ui"
import { useLabels } from "@tumaet/apollon/i18n/useLabels"
import { Position, NodeToolbar as ReactFlowNodeToolbar } from "@xyflow/react"
import { Pencil, Trash2 } from "lucide-react"
import { FC } from "react"
import { useShallow } from "zustand/shallow"

interface Props {
  elementId: string
  showEdit?: boolean
}
export const NodeToolbar: FC<Props> = ({ elementId, showEdit = true }) => {
  const setPopOverElementId = usePopoverStore(
    useShallow((state) => state.setPopOverElementId)
  )
  const handleDelete = useHandleDelete(elementId)

  const isDiagramModifiable = useDiagramModifiable()
  const selected = useIsOnlyThisElementSelected(elementId)
  const t = useLabels()

  return (
    <ReactFlowNodeToolbar
      isVisible={isDiagramModifiable && !!selected}
      position={Position.Top}
      align="end"
      offset={10}
      className="apollon-element-toolbar-host"
    >
      <ButtonGroup
        aria-label={t.selectionActions}
        orientation="vertical"
        className="apollon-element-toolbar nodrag nopan"
        onPointerDownCapture={(event) => event.stopPropagation()}
      >
        <IconButton
          ariaLabel={t.deleteElement}
          tooltip={t.deleteElement}
          onClick={handleDelete}
        >
          <Trash2 width={16} height={16} aria-hidden="true" />
        </IconButton>

        {showEdit && (
          <IconButton
            ariaLabel={t.editElement}
            tooltip={t.editElement}
            onClick={() => {
              setPopOverElementId(elementId)
            }}
          >
            <Pencil width={16} height={16} aria-hidden="true" />
          </IconButton>
        )}
      </ButtonGroup>
    </ReactFlowNodeToolbar>
  )
}
