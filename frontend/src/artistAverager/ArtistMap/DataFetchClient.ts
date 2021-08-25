/**
 * Manages asyncronous data fetches for the artist map, de-duplicating fetch requests and providing a
 * callback-based system for handling new data.
 */

import * as R from 'ramda';
import { filterNils, UnreachableException } from 'ameo-utils';

import { getArtistDataByInternalIDs, getArtistRelationshipsByInternalIDs } from '../api';

interface ArtistMapData {
  name: string;
}

export interface ArtistMapDataWithId extends ArtistMapData {
  id: number;
}

export interface ArtistRelationshipData {
  artistIDs: number[];
  res: ArrayBuffer;
}

const MAX_CONCURRENT_REQUESTS = { data: 4, relationship: 2 };
const CHUNK_SIZE = 450;

export default class DataFetchClient {
  public fetchedArtistDataByID: Map<number, ArtistMapData | null | 'FETCHING'> = new Map();
  private fetchedArtistRelationships: Set<number> = new Set();

  private artistDataCallback: ((data: ArtistMapData[]) => void) | null;
  private artistRelationshipsCallback: ((data: ArtistRelationshipData) => void) | null;

  private pendingArtistData: ArtistMapData[] = [];
  private pendingArtistRelationships: ArtistRelationshipData[] = [];

  private curActiveRequestCount = { data: 0, relationship: 0 };
  private requestPermitQueue: { data: (() => void)[]; relationship: (() => void)[] } = {
    data: [],
    relationship: [],
  };

  constructor() {
    //
  }

  private getRequestPermit(type: 'data' | 'relationship'): Promise<void> {
    if (this.curActiveRequestCount[type] < MAX_CONCURRENT_REQUESTS[type]) {
      this.curActiveRequestCount[type] += 1;
      // console.log(
      //   `Got permit immediately, active requests: ${this.curActiveRequestCount},type: ${type}`
      // );
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.requestPermitQueue[type].push(() => {
        if (this.curActiveRequestCount[type] >= MAX_CONCURRENT_REQUESTS[type]) {
          throw new UnreachableException();
        }

        this.curActiveRequestCount[type] += 1;
        resolve();
      });
    });
  }

  private releaseRequestPermit(type: 'data' | 'relationship') {
    this.curActiveRequestCount[type] -= 1;
    // console.log(`Released permit, active requests: ${this.curActiveRequestCount}`);
    if (this.curActiveRequestCount[type] < 0) {
      throw new UnreachableException();
    }
    this.requestPermitQueue[type].shift()?.();
  }

  public registerCallbacks(
    artistDataCallback: (data: ArtistMapDataWithId[]) => void,
    artistRelationshipsCallback: (data: ArtistRelationshipData) => void
  ) {
    if (this.artistDataCallback || this.artistRelationshipsCallback) {
      throw new Error('Cannot register callback more than once');
    }

    this.artistDataCallback = artistDataCallback;
    this.artistRelationshipsCallback = artistRelationshipsCallback;

    this.artistDataCallback(this.pendingArtistData);
    this.pendingArtistRelationships.forEach((data) => artistRelationshipsCallback(data));
    this.pendingArtistData = [];
    this.pendingArtistRelationships = [];
  }

  private async fetchArtistData(allIDs: number[]) {
    await this.getRequestPermit('data');

    const ids = allIDs.filter((id) => !this.fetchedArtistDataByID.has(id));
    if (ids.length === 0) {
      this.releaseRequestPermit('data');
      return;
    }

    try {
      const res = await getArtistDataByInternalIDs(ids);

      res.forEach((data, i) => {
        this.fetchedArtistDataByID.set(ids[i], data ? { name: data } : null);
      });

      const toEmit = filterNils(res).map((name, i) => ({ id: ids[i], name }));
      if (this.artistDataCallback) {
        this.artistDataCallback(toEmit);
      } else {
        this.pendingArtistData.push(...toEmit);
      }
    } finally {
      this.releaseRequestPermit('data');
    }
  }

  private async fetchArtistRelationshipsInner(allIDs: number[]) {
    await this.getRequestPermit('relationship');

    const ids = allIDs.filter((id) => !this.fetchedArtistRelationships.has(id));
    ids.forEach((id) => this.fetchedArtistRelationships.add(id));
    if (ids.length === 0) {
      this.releaseRequestPermit('relationship');
      return;
    }

    try {
      const res = await getArtistRelationshipsByInternalIDs(ids);
      const toEmit: ArtistRelationshipData = { artistIDs: ids, res };

      if (this.artistRelationshipsCallback) {
        this.artistRelationshipsCallback(toEmit);
      } else {
        this.pendingArtistRelationships.push(toEmit);
      }
    } finally {
      this.releaseRequestPermit('relationship');
    }
  }

  public getOrFetchArtistData(ids: number[]): (ArtistMapData | null)[] {
    const idsNeedingFetch: number[] = [];
    const res = ids.map((id) => {
      if (!this.fetchedArtistDataByID.has(id)) {
        idsNeedingFetch.push(id);
      }

      const data = this.fetchedArtistDataByID.get(id);
      if (!data || data === 'FETCHING') {
        return null;
      }
      return data;
    });

    // Kick off request to fetch the missing data in the background
    if (idsNeedingFetch.length > 0) {
      R.splitEvery(CHUNK_SIZE, idsNeedingFetch).forEach((ids) => {
        this.fetchArtistData(ids);
      });
    }

    return res;
  }

  // TODO: Coalesce small requests
  public fetchArtistRelationships(ids: number[]) {
    const idsNeedingFetch: number[] = ids.filter((id) => !this.fetchedArtistRelationships.has(id));

    // Kick off request to fetch the missing data in the background
    if (idsNeedingFetch.length > 0) {
      R.splitEvery(CHUNK_SIZE, idsNeedingFetch).forEach((ids) => {
        this.fetchArtistRelationshipsInner(ids);
      });
    }
  }
}
