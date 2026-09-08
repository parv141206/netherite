import { BaseEdgeProps, StepEdgeBody, CommonEdgeElements } from "../GenericEdge"
import { useDiagramStore, usePopoverStore } from "@tumaet/apollon/store/context"
import { useShallow } from "zustand/shallow"
import { useEdgeConfig } from "@tumaet/apollon/hooks/useEdgeConfig"
import { useStepPathEdge } from "@tumaet/apollon/hooks/useStepPathEdge"
import { useToolbar } from "@tumaet/apollon/hooks"
import { FeedbackDropzone } from "@tumaet/apollon/components/wrapper/FeedbackDropzone"
import { AssessmentSelectableWrapper } from "@tumaet/apollon/components"
import { getCustomColorsFromDataForEdge } from "@tumaet/apollon/utils/layoutUtils"
import { useRequiredInterfaceEdgeType } from "@tumaet/apollon/hooks/useRequiredInterfaceEdgeType"

const COMPONENT_REQUIRED_INTERFACE_TYPES = [
  "ComponentRequiredInterface",
  "ComponentRequiredQuarterInterface",
  "ComponentRequiredThreeQuarterInterface",
] as const

export const ComponentDiagramEdge = ({
  id,
  type,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  data,
}: BaseEdgeProps) => {
  const { handleDelete } = useToolbar({ id })

  const config = useEdgeConfig(
    type as
      | "ComponentDependency"
      | "ComponentProvidedInterface"
      | "ComponentRequiredInterface"
      | "ComponentRequiredThreeQuarterInterface"
      | "ComponentRequiredQuarterInterface"
  )

  const allowMidpointDragging =
    "allowMidpointDragging" in config ? config.allowMidpointDragging : true

  const assessments = useDiagramStore(useShallow((state) => state.assessments))

  const setPopOverElementId = usePopoverStore(
    useShallow((state) => state.setPopOverElementId)
  )

  const dynamicEdgeType = useRequiredInterfaceEdgeType({
    type,
    id,
    target,
    targetHandleId,
    requiredTypes: COMPONENT_REQUIRED_INTERFACE_TYPES,
    defaultType: "ComponentRequiredInterface",
    reducedType: "ComponentRequiredQuarterInterface",
  })
  const detachedTargetMarkerType = COMPONENT_REQUIRED_INTERFACE_TYPES.some(
    (requiredType) => requiredType === type
  )
    ? "ComponentRequiredInterface"
    : undefined

  const {
    pathRef,
    edgeData,
    currentPath,
    overlayPath,
    bendHandles,
    isBendDragging,
    draggingHandleSegmentIndex,
    hasInitialCalculation,
    markerEnd,
    markerStart,
    strokeDashArray,
    handlePointerDown,
    handleEndpointPointerDown,
    sourcePoint,
    targetPoint,
    sourcePosition: renderSourcePosition,
    targetPosition: renderTargetPosition,
    isDiagramModifiable,
    canEditEndpoint,
    targetInterfaceGeometry,
  } = useStepPathEdge({
    id,
    type: dynamicEdgeType,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    sourceHandleId,
    targetHandleId,
    data,
    allowMidpointDragging,
    detachedTargetMarkerType,
  })

  const { strokeColor } = getCustomColorsFromDataForEdge(data)
  const markerKey = `${id}-${markerStart ?? "none"}-${markerEnd ?? "none"}`

  return (
    <AssessmentSelectableWrapper elementId={id} asElement="g">
      <FeedbackDropzone elementId={id} asElement="path" elementType={type}>
        <StepEdgeBody
          id={id}
          markerKey={markerKey}
          currentPath={currentPath}
          overlayPath={overlayPath}
          pathRef={pathRef}
          strokeColor={strokeColor}
          strokeDashArray={strokeDashArray}
          hasInitialCalculation={hasInitialCalculation}
          isBendDragging={isBendDragging}
          draggingHandleSegmentIndex={draggingHandleSegmentIndex}
          markerStart={markerStart}
          markerEnd={markerEnd}
          targetInterfaceGeometry={targetInterfaceGeometry}
          sourcePoint={sourcePoint}
          targetPoint={targetPoint}
          sourcePosition={renderSourcePosition}
          targetPosition={renderTargetPosition}
          isDiagramModifiable={isDiagramModifiable}
          canEditEndpoint={canEditEndpoint}
          allowMidpointDragging={allowMidpointDragging}
          bendHandles={bendHandles}
          handleEndpointPointerDown={handleEndpointPointerDown}
          handlePointerDown={handlePointerDown}
        />

        <CommonEdgeElements
          id={id}
          data={data}
          pathMiddlePosition={edgeData.pathMiddlePosition}
          toolbarPosition={edgeData.toolbarPosition}
          isDiagramModifiable={isDiagramModifiable}
          assessments={assessments}
          handleDelete={handleDelete}
          setPopOverElementId={setPopOverElementId}
          type={dynamicEdgeType}
        />
      </FeedbackDropzone>
    </AssessmentSelectableWrapper>
  )
}
