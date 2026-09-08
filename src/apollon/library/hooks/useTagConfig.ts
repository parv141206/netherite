import { useMetadataStore } from "@tumaet/apollon/store/context"
import type { TagConfig } from "@tumaet/apollon/utils/tagUtils"

/** The editor's resolved tag configuration (disabled unless a host opts in). */
export const useTagConfig = (): TagConfig =>
  useMetadataStore((state) => state.tagConfig)
