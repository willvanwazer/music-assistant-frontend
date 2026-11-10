export interface CatalogEntry {
  json: string;
  storedAt: number;
}
export type CatalogEntries = [string, CatalogEntry][];
export interface CatalogStorage {
  load(scope: string): Promise<CatalogEntries>;
  save(scope: string, entries: CatalogEntries): Promise<void>;
  clear(scope: string): Promise<void>;
}
interface Snapshot {
  scope: string;
  entries: CatalogEntries;
}

/** One bounded snapshot on disk; a different authenticated scope never restores it. */
export class IndexedDbCatalogStorage implements CatalogStorage {
  private database?: Promise<IDBDatabase>;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private name = "ma-catalog-v1") {}

  load(scope: string): Promise<CatalogEntries> {
    return this.transaction("readonly", (store, done) => {
      const request = store.get("snapshot");
      request.onsuccess = () => {
        const snapshot = request.result as Snapshot | undefined;
        done(snapshot?.scope === scope ? snapshot.entries : []);
      };
    });
  }

  save(scope: string, entries: CatalogEntries): Promise<void> {
    return this.transaction("readwrite", (store, done) => {
      store.put({ scope, entries } satisfies Snapshot, "snapshot");
      done(undefined);
    });
  }

  clear(scope: string): Promise<void> {
    return this.transaction("readwrite", (store, done) => {
      const request = store.get("snapshot");
      request.onsuccess = () => {
        if ((request.result as Snapshot | undefined)?.scope === scope)
          store.delete("snapshot");
        done(undefined);
      };
    });
  }

  private transaction<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore, done: (result: T) => void) => void,
  ): Promise<T> {
    const operation = this.queue.then(async () => {
      const database = await this.open();
      return new Promise<T>((resolve, reject) => {
        let result: T;
        const transaction = database.transaction("catalog", mode);
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = transaction.onerror = () =>
          reject(transaction.error ?? new Error("Catalog storage unavailable"));
        run(transaction.objectStore("catalog"), (value) => (result = value));
      });
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  private open(): Promise<IDBDatabase> {
    return (this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, 1);
      let abandoned = false;
      const timeout = setTimeout(() => {
        abandoned = true;
        reject(new Error("Catalog storage timed out"));
      }, 1000);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("catalog");
      request.onerror = () => {
        clearTimeout(timeout);
        abandoned = true;
        reject(request.error ?? new Error("Catalog storage unavailable"));
      };
      request.onblocked = () => {
        clearTimeout(timeout);
        abandoned = true;
        reject(new Error("Catalog storage blocked"));
      };
      request.onsuccess = () => {
        clearTimeout(timeout);
        if (abandoned) request.result.close();
        else {
          request.result.onversionchange = () => request.result.close();
          resolve(request.result);
        }
      };
    }));
  }
}
