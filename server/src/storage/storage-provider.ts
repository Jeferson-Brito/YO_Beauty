export interface StoredObject {
  url: string;
  key: string;
}

export interface StorageProvider {
  save(input: { key: string; contentType: string; data: Buffer }): Promise<StoredObject>;
  delete(key: string): Promise<void>;
}
