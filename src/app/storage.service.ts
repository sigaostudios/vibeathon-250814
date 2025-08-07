import { Injectable } from '@angular/core';
import { createStorage, type StorageValue } from 'unstorage';
import localStorageDriver from 'unstorage/drivers/localstorage';

@Injectable({ providedIn: 'root' })
export class StorageService {
    // Namespaced base to avoid collisions across apps
    private storage = createStorage({
        driver: localStorageDriver({ base: 'app:' })
    });

    async getItem<T extends StorageValue>(key: string): Promise<T | null> {
        return this.storage.getItem<T>(key);
    }

    async setItem<T extends StorageValue>(key: string, value: T): Promise<void> {
        await this.storage.setItem<T>(key, value);
    }

    async removeItem(key: string): Promise<void> {
        await this.storage.removeItem(key);
    }

    async getKeys(base?: string): Promise<string[]> {
        return this.storage.getKeys(base);
    }
}
