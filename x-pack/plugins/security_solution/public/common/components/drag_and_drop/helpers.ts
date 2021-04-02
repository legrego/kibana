/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash/fp';
import { DropResult, FluidDragActions, Position } from 'react-beautiful-dnd';
import { Dispatch } from 'redux';
import { ActionCreator } from 'typescript-fsa';

import { stopPropagationAndPreventDefault } from '../accessibility/helpers';
import { alertsHeaders } from '../../../detections/components/alerts_table/default_config';
import { BrowserField, BrowserFields, getAllFieldsByName } from '../../containers/source';
import { dragAndDropActions } from '../../store/actions';
import { IdToDataProvider } from '../../store/drag_and_drop/model';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { timelineActions } from '../../../timelines/store/timeline';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { addContentToTimeline } from '../../../timelines/components/timeline/data_providers/helpers';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { TimelineId } from '../../../../common/types/timeline';

export const draggableIdPrefix = 'draggableId';

export const droppableIdPrefix = 'droppableId';

export const draggableContentPrefix = `${draggableIdPrefix}.content.`;

export const draggableTimelineProvidersPrefix = `${draggableIdPrefix}.timelineProviders.`;

export const draggableFieldPrefix = `${draggableIdPrefix}.field.`;

export const droppableContentPrefix = `${droppableIdPrefix}.content.`;

export const droppableFieldPrefix = `${droppableIdPrefix}.field.`;

export const droppableTimelineProvidersPrefix = `${droppableIdPrefix}.timelineProviders.`;

export const droppableTimelineColumnsPrefix = `${droppableIdPrefix}.timelineColumns.`;

export const droppableTimelineFlyoutBottomBarPrefix = `${droppableIdPrefix}.flyoutButton.`;

export const getDraggableId = (dataProviderId: string): string =>
  `${draggableContentPrefix}${dataProviderId}`;

export const getDraggableFieldId = ({
  contextId,
  fieldId,
}: {
  contextId: string;
  fieldId: string;
}): string => `${draggableFieldPrefix}${escapeContextId(contextId)}.${escapeFieldId(fieldId)}`;

export const getTimelineProviderDroppableId = ({
  groupIndex,
  timelineId,
}: {
  groupIndex: number;
  timelineId: string;
}): string => `${droppableTimelineProvidersPrefix}${timelineId}.group.${groupIndex}`;

export const getTimelineProviderDraggableId = ({
  dataProviderId,
  groupIndex,
  timelineId,
}: {
  dataProviderId: string;
  groupIndex: number;
  timelineId: string;
}): string =>
  `${draggableTimelineProvidersPrefix}${timelineId}.group.${groupIndex}.${dataProviderId}`;

export const getDroppableId = (visualizationPlaceholderId: string): string =>
  `${droppableContentPrefix}${visualizationPlaceholderId}`;

export const sourceIsContent = (result: DropResult): boolean =>
  result.source.droppableId.startsWith(droppableContentPrefix);

export const sourceAndDestinationAreSameTimelineProviders = (result: DropResult): boolean => {
  const regex = /^droppableId\.timelineProviders\.(\S+)\./;
  const sourceMatches = result.source.droppableId.match(regex) ?? [];
  const destinationMatches = result.destination?.droppableId.match(regex) ?? [];

  return (
    sourceMatches.length >= 2 &&
    destinationMatches.length >= 2 &&
    sourceMatches[1] === destinationMatches[1]
  );
};

export const draggableIsContent = (result: DropResult | { draggableId: string }): boolean =>
  result.draggableId.startsWith(draggableContentPrefix);

export const draggableIsField = (result: DropResult | { draggableId: string }): boolean =>
  result.draggableId.startsWith(draggableFieldPrefix);

export const reasonIsDrop = (result: DropResult): boolean => result.reason === 'DROP';

export const destinationIsTimelineProviders = (result: DropResult): boolean =>
  result.destination != null &&
  result.destination.droppableId.startsWith(droppableTimelineProvidersPrefix);

export const destinationIsTimelineColumns = (result: DropResult): boolean =>
  result.destination != null &&
  result.destination.droppableId.startsWith(droppableTimelineColumnsPrefix);

export const destinationIsTimelineButton = (result: DropResult): boolean =>
  result.destination != null &&
  result.destination.droppableId.startsWith(droppableTimelineFlyoutBottomBarPrefix);

export const getProviderIdFromDraggable = (result: DropResult): string =>
  result.draggableId.substring(result.draggableId.lastIndexOf('.') + 1);

export const getFieldIdFromDraggable = (result: DropResult): string =>
  unEscapeFieldId(result.draggableId.substring(result.draggableId.lastIndexOf('.') + 1));

export const escapeDataProviderId = (path: string) => path.replace(/\./g, '_');

export const escapeContextId = (path: string) => path.replace(/\./g, '_');

export const escapeFieldId = (path: string) => path.replace(/\./g, '!!!DOT!!!');

export const unEscapeFieldId = (path: string) => path.replace(/!!!DOT!!!/g, '.');

export const providerWasDroppedOnTimeline = (result: DropResult): boolean =>
  reasonIsDrop(result) &&
  draggableIsContent(result) &&
  sourceIsContent(result) &&
  destinationIsTimelineProviders(result);

export const userIsReArrangingProviders = (result: DropResult): boolean =>
  reasonIsDrop(result) && sourceAndDestinationAreSameTimelineProviders(result);

export const fieldWasDroppedOnTimelineColumns = (result: DropResult): boolean =>
  reasonIsDrop(result) && draggableIsField(result) && destinationIsTimelineColumns(result);

interface AddProviderToTimelineParams {
  activeTimelineDataProviders: DataProvider[];
  dataProviders: IdToDataProvider;
  dispatch: Dispatch;
  noProviderFound?: ActionCreator<{
    id: string;
  }>;
  onAddedToTimeline: (fieldOrValue: string) => void;
  result: DropResult;
  timelineId: string;
}

interface AddFieldToTimelineColumnsParams {
  upsertColumn?: ActionCreator<{
    column: ColumnHeaderOptions;
    id: string;
    index: number;
  }>;
  browserFields: BrowserFields;
  dispatch: Dispatch;
  result: DropResult;
  timelineId: string;
}

export const addProviderToTimeline = ({
  activeTimelineDataProviders,
  dataProviders,
  dispatch,
  result,
  timelineId,
  noProviderFound = dragAndDropActions.noProviderFound,
  onAddedToTimeline,
}: AddProviderToTimelineParams): void => {
  const providerId = getProviderIdFromDraggable(result);
  const providerToAdd = dataProviders[providerId];

  if (providerToAdd) {
    addContentToTimeline({
      dataProviders: activeTimelineDataProviders,
      destination: result.destination,
      dispatch,
      onAddedToTimeline,
      providerToAdd,
      timelineId,
    });
  } else {
    dispatch(noProviderFound({ id: providerId }));
  }
};

const linkFields: Record<string, string> = {
  'signal.rule.name': 'signal.rule.id',
  'event.module': 'rule.reference',
};

export const addFieldToTimelineColumns = ({
  upsertColumn = timelineActions.upsertColumn,
  browserFields,
  dispatch,
  result,
  timelineId,
}: AddFieldToTimelineColumnsParams): void => {
  const fieldId = getFieldIdFromDraggable(result);
  const allColumns = getAllFieldsByName(browserFields);
  const column = allColumns[fieldId];
  const initColumnHeader =
    timelineId === TimelineId.detectionsPage || timelineId === TimelineId.detectionsRulesDetailsPage
      ? alertsHeaders.find((c) => c.id === fieldId) ?? {}
      : {};

  if (column != null) {
    dispatch(
      upsertColumn({
        column: {
          category: column.category,
          columnHeaderType: 'not-filtered',
          description: isString(column.description) ? column.description : undefined,
          example: isString(column.example) ? column.example : undefined,
          id: fieldId,
          linkField: linkFields[fieldId] ?? undefined,
          type: column.type,
          aggregatable: column.aggregatable,
          width: DEFAULT_COLUMN_MIN_WIDTH,
          ...initColumnHeader,
        },
        id: timelineId,
        index: result.destination != null ? result.destination.index : 0,
      })
    );
  } else {
    // create a column definition, because it doesn't exist in the browserFields:
    dispatch(
      upsertColumn({
        column: {
          columnHeaderType: 'not-filtered',
          id: fieldId,
          width: DEFAULT_COLUMN_MIN_WIDTH,
        },
        id: timelineId,
        index: result.destination != null ? result.destination.index : 0,
      })
    );
  }
};

/**
 * Prevents fields from being dragged or dropped to any area other than column
 * header drop zone in the timeline
 */
export const DRAG_TYPE_FIELD = 'drag-type-field';

/** This class is added to the document body while dragging */
export const IS_DRAGGING_CLASS_NAME = 'is-dragging';

/** This class is added to the document body while timeline field dragging */
export const IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME = 'is-timeline-field-dragging';

export const allowTopN = ({
  browserField,
  fieldName,
}: {
  browserField: Partial<BrowserField> | undefined;
  fieldName: string;
}): boolean => {
  const isAggregatable = browserField?.aggregatable ?? false;
  const fieldType = browserField?.type ?? '';
  const isAllowedType = [
    'boolean',
    'geo-point',
    'geo-shape',
    'ip',
    'keyword',
    'number',
    'numeric',
    'string',
  ].includes(fieldType);

  // TODO: remove this explicit allowlist when the ECS documentation includes alerts
  const isAllowlistedNonBrowserField = [
    'signal.ancestors.depth',
    'signal.ancestors.id',
    'signal.ancestors.rule',
    'signal.ancestors.type',
    'signal.original_event.action',
    'signal.original_event.category',
    'signal.original_event.code',
    'signal.original_event.created',
    'signal.original_event.dataset',
    'signal.original_event.duration',
    'signal.original_event.end',
    'signal.original_event.hash',
    'signal.original_event.id',
    'signal.original_event.kind',
    'signal.original_event.module',
    'signal.original_event.original',
    'signal.original_event.outcome',
    'signal.original_event.provider',
    'signal.original_event.risk_score',
    'signal.original_event.risk_score_norm',
    'signal.original_event.sequence',
    'signal.original_event.severity',
    'signal.original_event.start',
    'signal.original_event.timezone',
    'signal.original_event.type',
    'signal.original_time',
    'signal.parent.depth',
    'signal.parent.id',
    'signal.parent.index',
    'signal.parent.rule',
    'signal.parent.type',
    'signal.rule.created_by',
    'signal.rule.description',
    'signal.rule.enabled',
    'signal.rule.false_positives',
    'signal.rule.filters',
    'signal.rule.from',
    'signal.rule.id',
    'signal.rule.immutable',
    'signal.rule.index',
    'signal.rule.interval',
    'signal.rule.language',
    'signal.rule.max_signals',
    'signal.rule.name',
    'signal.rule.note',
    'signal.rule.output_index',
    'signal.rule.query',
    'signal.rule.references',
    'signal.rule.risk_score',
    'signal.rule.rule_id',
    'signal.rule.saved_id',
    'signal.rule.severity',
    'signal.rule.size',
    'signal.rule.tags',
    'signal.rule.threat',
    'signal.rule.threat.tactic.id',
    'signal.rule.threat.tactic.name',
    'signal.rule.threat.tactic.reference',
    'signal.rule.threat.technique.id',
    'signal.rule.threat.technique.name',
    'signal.rule.threat.technique.reference',
    'signal.rule.timeline_id',
    'signal.rule.timeline_title',
    'signal.rule.to',
    'signal.rule.type',
    'signal.rule.updated_by',
    'signal.rule.version',
    'signal.status',
  ].includes(fieldName);

  return isAllowlistedNonBrowserField || (isAggregatable && isAllowedType);
};

export const getTimelineIdFromColumnDroppableId = (droppableId: string) =>
  droppableId.slice(droppableId.lastIndexOf('.') + 1);

/** The draggable will move this many pixes via the keyboard when the arrow key is pressed */
export const KEYBOARD_DRAG_OFFSET = 20;

export const DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME = 'draggable-keyboard-wrapper';

/**
 * Temporarily disables tab focus on child links of the draggable to work
 * around an issue where tab focus becomes stuck on the interactive children
 *
 * NOTE: This function is (intentionally) only effective when used in a key
 * event handler, because it automatically restores focus capabilities on
 * the next tick.
 */
export const temporarilyDisableInteractiveChildTabIndexes = (draggableElement: HTMLDivElement) => {
  const interactiveChildren = draggableElement.querySelectorAll('a, button');
  interactiveChildren.forEach((interactiveChild) => {
    interactiveChild.setAttribute('tabindex', '-1'); // DOM mutation
  });

  // restore the default tabindexs on the next tick:
  setTimeout(() => {
    interactiveChildren.forEach((interactiveChild) => {
      interactiveChild.setAttribute('tabindex', '0'); // DOM mutation
    });
  }, 0);
};

export const draggableKeyDownHandler = ({
  beginDrag,
  cancelDragActions,
  closePopover,
  draggableElement,
  dragActions,
  dragToLocation,
  endDrag,
  keyboardEvent,
  openPopover,
  setDragActions,
}: {
  beginDrag: () => FluidDragActions | null;
  cancelDragActions: () => void;
  closePopover?: () => void;
  draggableElement: HTMLDivElement;
  dragActions: FluidDragActions | null;
  dragToLocation: ({
    // eslint-disable-next-line @typescript-eslint/no-shadow
    dragActions,
    position,
  }: {
    dragActions: FluidDragActions | null;
    position: Position;
  }) => void;
  keyboardEvent: React.KeyboardEvent;
  endDrag: (dragActions: FluidDragActions | null) => void;
  openPopover?: () => void;
  setDragActions: (value: React.SetStateAction<FluidDragActions | null>) => void;
}) => {
  let currentPosition: DOMRect | null = null;

  switch (keyboardEvent.key) {
    case ' ':
      if (!dragActions) {
        // start dragging, because space was pressed
        if (closePopover != null) {
          closePopover();
        }
        setDragActions(beginDrag());
      } else {
        // end dragging, because space was pressed
        endDrag(dragActions);
        setDragActions(null);
      }
      break;
    case 'Escape':
      cancelDragActions();
      break;
    case 'Tab':
      // IMPORTANT: we do NOT want to stop propagation and prevent default when Tab is pressed
      temporarilyDisableInteractiveChildTabIndexes(draggableElement);
      break;
    case 'ArrowUp':
      currentPosition = draggableElement.getBoundingClientRect();
      dragToLocation({
        dragActions,
        position: { x: currentPosition.x, y: currentPosition.y - KEYBOARD_DRAG_OFFSET },
      });
      break;
    case 'ArrowDown':
      currentPosition = draggableElement.getBoundingClientRect();
      dragToLocation({
        dragActions,
        position: { x: currentPosition.x, y: currentPosition.y + KEYBOARD_DRAG_OFFSET },
      });
      break;
    case 'ArrowLeft':
      currentPosition = draggableElement.getBoundingClientRect();
      dragToLocation({
        dragActions,
        position: { x: currentPosition.x - KEYBOARD_DRAG_OFFSET, y: currentPosition.y },
      });
      break;
    case 'ArrowRight':
      currentPosition = draggableElement.getBoundingClientRect();
      dragToLocation({
        dragActions,
        position: { x: currentPosition.x + KEYBOARD_DRAG_OFFSET, y: currentPosition.y },
      });
      break;
    case 'Enter':
      stopPropagationAndPreventDefault(keyboardEvent); // prevents the first item in the popover from getting an errant ENTER
      if (!dragActions && openPopover != null) {
        openPopover();
      }
      break;
    default:
      break;
  }
};
