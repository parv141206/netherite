import { DefaultNodeEditPopover } from "../DefaultNodeEditPopover"
import { PopoverProps } from "../types"
import { useLabels } from "@tumaet/apollon/i18n/useLabels"

export const SyntaxTreeTerminalEditPopover: React.FC<PopoverProps> = ({
  elementId,
}) => {
  const t = useLabels()
  return (
    <DefaultNodeEditPopover elementId={elementId} placeholder={t.terminal} />
  )
}
