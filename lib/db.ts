const DB_NAME = "BookMindDB";
const DB_VERSION = 1;
const STORE_NAME = "books";

export const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

export const saveBookToDB = async (book: any): Promise<void> => {
    // 1. Save to Local IndexedDB (Always)
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(book);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });

    // 2. Sync to Cloud if User is Logged In
    if (book.userId) {
        // Don't await cloud sync to keep UI responsive, just fire and forget (or log error)
        fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book, userId: book.userId })
        }).catch(err => console.error("Failed to sync book to cloud:", err));
    }
};

export const getBookFromDB = async (id: string): Promise<any> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getAllBooksFromDB = async (userId?: string): Promise<any[]> => {
    // 1. Get Local Books
    const db = await openDB();
    const localBooks = await new Promise<any[]>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    // 2. If User is Logged In, Fetch Cloud Books and Merge
    if (userId) {
        try {
            const response = await fetch(`/api/books?userId=${userId}`);
            if (response.ok) {
                const cloudBooks = await response.json();

                // Merge strategies could vary, here we prioritize cloud or just concat unique
                // For simplicity, let's just return cloud books + local books that aren't in cloud
                const cloudIds = new Set(cloudBooks.map((b: any) => b.id));
                const uniqueLocal = localBooks.filter(b => !cloudIds.has(b.id));

                return [...cloudBooks, ...uniqueLocal];
            }
        } catch (err) {
            console.error("Failed to fetch cloud books:", err);
        }
    }

    return localBooks;
};

export const clearAllBooksFromDB = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
