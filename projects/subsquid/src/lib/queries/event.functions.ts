import { Adapter, Fields, Where } from '../subsquid';
import { catchError, combineLatest, map, Observable, of, share, shareReplay, switchMap, tap, throwError } from 'rxjs';
import * as st from '../subsquid.types';
import { types } from '@polkadapt/core';
import { isDate, isDefined, isPositiveNumber, isString } from './helpers';


export type ArchiveEventInput = {
  id: string;
  args: { [k: string]: any };
  indexInBlock: number;
  name: string;
  phase: string;
  block: {
    height: number;
    hash: string;
    timestamp: string;
    spec: {
      specName: string;
      specVersion: number;
    };
  };
  extrinsic: {
    indexInBlock: number;
  };
};

const archiveFields: Fields = [
  'id',
  'args',
  'indexInBlock',
  'phase',
  'name',
  {
    block: [
      'height', 'hash', 'timestamp',
      {
        spec: ['specName', 'specVersion']
      }
    ]
  },
  {
    extrinsic: ['indexInBlock']
  }
];

export type ArchiveEventArgsInput = {
  id: string;
  args: { [k: string]: any };
  phase: string;
  name: string;
  block: {
    spec: {
      specName: string;
    };
  };
};

const archiveArgsFields: Fields = [
  'id',
  'args',
  'phase',
  'name',
  {
    block: [
      {
        spec: ['specVersion']
      }
    ]
  }
];


export type GSExplorerEventInput = {
  id: string;
  blockNumber: number;
  timestamp: string;
  palletName: string;
  eventName: string;
  indexInBlock: number;
  block: {
    hash: string;
    specVersion: number;
  };
  extrinsic: {
    indexInBlock: number;
  };
  call: {
    argsStr: string;
  };
};

const gsExplorerFields: Fields = [
  'id',
  'blockNumber',
  'timestamp',
  'palletName',
  'eventName',
  'indexInBlock',
  {
    block: [
      'hash',
      'specVersion'
    ]
  },
  {
    extrinsic: [
      'indexInBlock'
    ]
  },
  {
    call: [
      'argsStr'
    ]
  }
];

export interface EventsFilters {
  blockNumber?: number;
  eventModule?: string;
  eventName?: string;
  extrinsicIdx?: number;
  specName?: string;
  specVersion?: number;
  dateRangeBegin?: Date;
  dateRangeEnd?: Date;
  blockRangeBegin?: number;
  blockRangeEnd?: number;
}

export const getEventsBase = (
  adapter: Adapter,
  pageSize?: number,
  blockNumber?: string | number,
  eventIdx?: number,
  eventModule?: string,
  eventName?: string,
  extrinsicIdx?: number,
  specName?: string,
  specVersion?: number,
  dateRangeBegin?: Date,
  dateRangeEnd?: Date,
  blockRangeBegin?: number,
  blockRangeEnd?: number
): Observable<types.Event[]> => {

  const gsWhere: Where = {};
  const archiveWhere: Where = {};

  if (isDefined(blockNumber)) {
    if (isPositiveNumber(blockNumber)) {
      archiveWhere['block'] = gsWhere['block'] ? gsWhere['block'] as Where : {};
      archiveWhere['block']['height_eq'] = blockNumber;
      gsWhere['blockNumber_eq'] = blockNumber;
    } else {
      return throwError(() => 'Provided block number must be a positive number.');
    }
  }

  if (isDefined(eventIdx)) {
    if (isPositiveNumber(eventIdx)) {
      archiveWhere['indexInBlock_eq'] = eventIdx;
      gsWhere['indexInBlock_eq'] = eventIdx;
    } else {
      return throwError(() => 'Provided eventIdx must be a positive number.');
    }
  }

  if (isDefined(eventModule)) {
    if (isString(eventModule)) {
      // archiveWhere['name_startsWith'] = eventModule;
      gsWhere['palletName_eq'] = eventModule;
    } else {
      return throwError(() => 'Provided event module (pallet) must be a non-empty string.');
    }
  }

  if (isDefined(eventName)) {
    if (isString(eventName)) {
      if (isDefined(eventModule)) {
        // archiveWhere['name_endsWith'] = eventName;
        gsWhere['eventName_eq'] = eventName;
      } else {
        return throwError(() => 'Missing event module (string), only event name is provided.');
      }
    } else {
      return throwError(() => 'Provided event name must be a non-empty string.');
    }
  }

  if (isDefined(extrinsicIdx)) {
    if (isPositiveNumber(extrinsicIdx)) {
      if (isDefined(blockNumber)) {
        archiveWhere['extrinsic'] = archiveWhere['extrinsic'] ? archiveWhere['extrinsic'] as Where : {};
        archiveWhere['extrinsic']['indexInBlock_eq'] = extrinsicIdx;
        gsWhere['extrinsic'] = gsWhere['extrinsic'] ? gsWhere['extrinsic'] as Where : {};
        gsWhere['extrinsic']['indexInBlock_eq'] = extrinsicIdx;
      } else {
        return throwError(() => 'Missing block number (number), only extrinsicIdx is provided.');
      }
    } else {
      return throwError(() => 'Provided extrinsicIdx must be a positive number.');
    }
  }

  if (isDefined(specName)) {
    if (isString(specName)) {
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['spec'] = archiveWhere['block']['spec'] ? archiveWhere['block']['spec'] as Where : {};
      archiveWhere['block']['spec']['specName_eq'] = specName;
    } else {
      return throwError(() => 'Provided spec name must be a non-empty string.');
    }
  }

  if (isDefined(specVersion)) {
    if (isPositiveNumber(specVersion)) {
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['spec'] = archiveWhere['block']['spec'] ? archiveWhere['block']['spec'] as Where : {};
      archiveWhere['block']['spec']['specVersion_eq'] = specVersion;
      gsWhere['block'] = gsWhere['block'] ? gsWhere['block'] as Where : {};
      gsWhere['block']['specVersion_eq'] = specVersion;
    } else {
      return throwError(() => 'Provided spec version must be a number.');
    }
  }

  if (isDefined(dateRangeBegin) && isDefined(dateRangeEnd)) {
    if (isDate(dateRangeBegin) && isDate(dateRangeEnd)) {
      if (dateRangeBegin < dateRangeEnd) {
        return throwError(() => 'Provided date range is invalid.');
      }
      const timestampBegin = `${dateRangeBegin.toISOString().split('.')[0]}.000000Z`;
      const timestampEnd = `${dateRangeEnd.toISOString().split('.')[0]}.000000Z`;
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['timestamp_gte'] = timestampBegin;
      archiveWhere['block']['timestamp_lte'] = timestampEnd;
      gsWhere['timestamp_gte'] = timestampBegin;
      gsWhere['timestamp_lte'] = timestampEnd;
    } else {
      return throwError(() => 'Provided begin and end date must be a Date.');
    }
  } else if (isDefined(dateRangeBegin)) {
    if (isDate(dateRangeBegin)) {
      const timestampBegin = `${dateRangeBegin.toISOString().split('.')[0]}.000000Z`;
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['timestamp_gte'] = timestampBegin;
      gsWhere['timestamp_gte'] = timestampBegin;
    } else {
      return throwError(() => 'Provided begin date must be a Date.');
    }
  } else if (isDefined(dateRangeEnd)) {
    if (isDate(dateRangeEnd)) {
      const timestampEnd = `${dateRangeEnd.toISOString().split('.')[0]}.000000Z`;
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      gsWhere['timestamp_lte'] = timestampEnd;
    } else {
      return throwError(() => 'Provided end date must be a Date.');
    }
  }

  if (isDefined(blockRangeBegin) && isDefined(blockRangeEnd)) {
    if (isPositiveNumber(blockRangeBegin) && !isPositiveNumber(blockRangeEnd)) {
      if (blockRangeEnd < blockRangeBegin) {
        return throwError(() => 'Provided block number range is invalid.');
      }
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['height_gte'] = blockRangeBegin;
      archiveWhere['block']['height_lte'] = blockRangeEnd;
      gsWhere['blockNumber_gte'] = blockRangeBegin;
      gsWhere['blockNumber_lte'] = blockRangeEnd;
    } else {
      return throwError(() => 'Provided block range begin and end must be positive numbers.');
    }
  } else if (isDefined(blockRangeBegin)) {
    if (isPositiveNumber(blockRangeBegin)) {
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['height_gte'] = blockRangeBegin;
      gsWhere['blockNumber_gte'] = blockRangeBegin;
    } else {
      return throwError(() => 'Provided begin block must be a positive number.');
    }
  } else if (isDefined(blockRangeEnd)) {
    if (isPositiveNumber(blockRangeEnd)) {
      archiveWhere['block'] = archiveWhere['block'] ? archiveWhere['block'] as Where : {};
      archiveWhere['block']['height_lte'] = blockRangeEnd;
      gsWhere['blockNumber_lte'] = blockRangeEnd;
    } else {
      return throwError(() => 'Provided end block must be a positive number.');
    }
  }

  const contentType = 'events';
  const orderBy = 'id_DESC';

  return adapter.queryGSExplorer<GSExplorerEventInput[]>(
    contentType,
    gsExplorerFields,
    gsWhere,
    orderBy,
    pageSize
  ).pipe(
    catchError(() =>
      adapter.queryArchive<ArchiveEventInput[]>(
        contentType,
        archiveFields,
        archiveWhere,
        orderBy,
        pageSize
      )),
    switchMap(
      (rawEvents) => {
        if (!rawEvents) {
          return throwError(() => new Error('Fetching events from subsquid failed.'));
        }

        if (rawEvents && rawEvents.length === 0) {
          return of([]);
        }

        const event = rawEvents[0];

        if (Object.keys(event).indexOf('args') === -1) {
          // No args attribute in event, we are dealing with an event coming from the GS Explorer.
          // Get args from archive.
          return combineLatest([
            of(rawEvents as GSExplorerEventInput[]),
            adapter.queryArchive<ArchiveEventArgsInput[]>(
              contentType,
              archiveArgsFields,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              {id_in: rawEvents.map((v) => v.id)},
              orderBy,
              pageSize
            )
          ]).pipe(
            tap(() => {console.log('cancel???');}),
            map(([events, eventsArgs]) =>
              events.map((ev) => {
                const evArgs = eventsArgs.find((a) => ev.id === a.id);
                const modifiedEvent = Object.assign(ev) as GSExplorerEventInput & ArchiveEventArgsInput;
                if (evArgs) {
                  modifiedEvent.args = evArgs.args;
                  modifiedEvent.block.spec = {specName: evArgs.block.spec.specName};
                  modifiedEvent.phase = evArgs.phase;
                  modifiedEvent.name = evArgs.name;
                }
                return modifiedEvent;
              })
            ),
            catchError((e) => {
              console.error(e);
              return of(rawEvents as GSExplorerEventInput[]);
            })
          );
        } else {
          return of(rawEvents as ArchiveEventInput[]);
        }
      }
    ),
    map((events) =>
      events.map<st.Event>((event) => {
        const splittenName: string[] | null = (event as ArchiveEventInput).name ? (event as ArchiveEventInput).name.split('.') : null;

        return {
          blockNumber: (event as GSExplorerEventInput).blockNumber || (event as ArchiveEventInput).block?.height,
          eventIdx: event.indexInBlock,
          extrinsicIdx: event.extrinsic?.indexInBlock,
          event: (event as ArchiveEventInput).name ||
            (event as GSExplorerEventInput).eventName &&
            `${(event as GSExplorerEventInput).palletName}.${(event as GSExplorerEventInput).eventName}`,
          eventModule: (event as GSExplorerEventInput).palletName || splittenName && splittenName[0],
          eventName: (event as GSExplorerEventInput).eventName || splittenName && splittenName[1],
          attributes: (event as ArchiveEventInput).args
            ? JSON.stringify((event as ArchiveEventInput).args)
            : (event as GSExplorerEventInput).call.argsStr,
          blockDatetime: (event as GSExplorerEventInput).timestamp || (event as ArchiveEventInput).block?.timestamp,
          blockHash: event.block.hash,
          eventPhaseName: (event as ArchiveEventInput).phase,
          specName: (event as ArchiveEventInput).block?.spec?.specName,
          specVersion: (event as GSExplorerEventInput).block?.specVersion || (event as ArchiveEventInput).block?.spec?.specVersion
        };
      })
    )
  );
};

export interface EventsFilters {
  blockNumber?: number;
  eventModule?: string;
  eventName?: string;
  extrinsicIdx?: number;
  specName?: string;
  specVersion?: number;
  dateRangeBegin?: Date;
  dateRangeEnd?: Date;
  blockRangeBegin?: number;
  blockRangeEnd?: number;
}

const identifiers = ['blockNumber', 'eventIdx'];


export const getEvent = (adapter: Adapter) => {
  const fn = (blockNumber: number, eventIdx: number) =>
    getEventsBase(adapter, 1, blockNumber, eventIdx).pipe(
      catchError((e: string) => throwError(() => new Error(`[SubsquidAdapter] getEvent: ${e}`))),
      map((events) => events[0])
    );
  fn.identifiers = identifiers;
  return fn;
};
export const getEvents = (adapter: Adapter) => {
  const fn = (filters?: EventsFilters, pageSize?: number) => {
    filters = filters || {};
    return getEventsBase(
      adapter,
      pageSize,
      filters.blockNumber,
      undefined,
      filters.eventModule,
      filters.eventName,
      filters.extrinsicIdx,
      filters.specName,
      filters.specVersion,
      filters.dateRangeBegin,
      filters.dateRangeEnd,
      filters.blockRangeBegin,
      filters.blockRangeEnd
    ).pipe(
      catchError((e: string) => throwError(() => new Error(`[SubsquidAdapter] getEvents: ${e}`)))
    );
  };
  fn.identifiers = identifiers;
  return fn;
};
export const subscribeNewEvent = () => {
};
export const getEventsByAccount = () => {
};
export const subscribeNewEventByAccount = () => {
};
