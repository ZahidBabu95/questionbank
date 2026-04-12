import { useState, useCallback } from 'react';

const DB_NAME = 'QuestionShaperCache';
const STORE_NAME = 'scrapeResults';
const VERSION = 1;
const TTL_MS = 60 * 60 * 1000; // 1 hour

export const computeFileHash = async (file) => {
    try {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    } catch (e) {
        console.warn('Could not compute file hash', e);
        return null; // fallback
    }
};

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const useScrapeCache = () => {
    const [isDbReady, setIsDbReady] = useState(false);

    // Get cached result
    const getCachedResult = useCallback(async (hash) => {
        if (!hash) return null;
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(hash);

                req.onsuccess = () => {
                    const record = req.result;
                    if (record) {
                        const now = Date.now();
                        if (now - record.timestamp > TTL_MS) {
                            // Expired
                            deleteCachedResult(hash).catch(console.warn);
                            resolve(null);
                        } else {
                            // Valid
                            resolve(record.result);
                        }
                    } else {
                        resolve(null);
                    }
                };
                req.onerror = () => reject(req.error);
            });
        } catch (error) {
            console.error('IndexedDB get error:', error);
            return null;
        }
    }, []);

    // Save result to cache
    const saveToCache = useCallback(async (hash, result) => {
        if (!hash || !result) return;
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const record = {
                    hash,
                    result,
                    timestamp: Date.now()
                };
                const req = store.put(record);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (error) {
            console.error('IndexedDB save error:', error);
        }
    }, []);

    // Delete specific cache entry
    const deleteCachedResult = async (hash) => {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.delete(hash);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } catch (error) {
            console.error('IndexedDB delete error:', error);
        }
    };

    return {
        getCachedResult,
        saveToCache,
        computeFileHash
    };
};
