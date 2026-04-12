import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * A custom hook to automatically save form data to localStorage and restore it.
 * 
 * @param {string} storageKey - The unique key for localStorage.
 * @param {object|array} dataToSave - The data object that should be synchronized.
 * @param {number} delayMs - Optional delay for auto-save (default 20 seconds).
 * @returns {object} { lastSavedTime, restoreData, clearSavedData, hasSavedData }
 */
const useAutoSave = (storageKey, dataToSave, delayMs = 20000) => {
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [hasSavedData, setHasSavedData] = useState(false);
    
    // We use a ref so the effect doesn't constantly re-bind and run on every keystroke,
    // although for 20s intervals, debouncing is better.
    const dataRef = useRef(dataToSave);
    
    useEffect(() => {
        dataRef.current = dataToSave;
    }, [dataToSave]);

    // Check if there is existing data on mount
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            setHasSavedData(true);
        }
    }, [storageKey]);

    useEffect(() => {
        const interval = setInterval(() => {
            // Check if there's actually meaningful data before saving
            // (e.g., skip empty defaults)
            if (dataRef.current) {
                localStorage.setItem(storageKey, JSON.stringify({
                    data: dataRef.current,
                    timestamp: new Date().toISOString()
                }));
                setLastSavedTime(new Date());
            }
        }, delayMs);
        
        return () => clearInterval(interval);
    }, [storageKey, delayMs]);

    const restoreData = useCallback(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.data;
            }
        } catch (e) {
            console.error('Failed to restore auto-saved data', e);
        }
        return null;
    }, [storageKey]);

    const clearSavedData = useCallback(() => {
        localStorage.removeItem(storageKey);
        setHasSavedData(false);
        setLastSavedTime(null);
    }, [storageKey]);

    return { lastSavedTime, restoreData, clearSavedData, hasSavedData };
};

export default useAutoSave;
