import ePub from 'epubjs';

export interface EpubBook {
    id: string;
    title: string;
    author: string;
    coverImage?: string;
    coverColor: string;
    filePath: string;
}

/**
 * List of EPUB files in the public/books directory
 */
export const EPUB_BOOKS: EpubBook[] = [
    {
        id: 'epub-1',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        coverColor: 'bg-yellow-200',
        filePath: '/books/slhm922daigq5gxuhjscrvil-0001-the-great-gatsby-f-scott-fitzgerald.epub',
        coverImage: '/covers/slhm922daigq5gxuhjscrvil.jpg'
    },
    {
        id: 'epub-2',
        title: 'The Adventures of Huckleberry Finn',
        author: 'Mark Twain',
        coverColor: 'bg-blue-200',
        filePath: '/books/j1h7f8zakusf7cm6knxws6cw-0009-the-adventures-of-huckleberry-finn-mark-twain.epub',
        coverImage: '/covers/j1h7f8zakusf7cm6knxws6cw.jpg'
    },
    {
        id: 'epub-3',
        title: 'A Tale of Two Cities',
        author: 'Charles Dickens',
        coverColor: 'bg-red-200',
        filePath: '/books/t8mz691mhm6800qr63cg6lhp-0013-a-tale-of-two-cities-charles-dickens.epub',
        coverImage: '/covers/t8mz691mhm6800qr63cg6lhp.jpg'
    },
    {
        id: 'epub-4',
        title: 'Anna Karenina',
        author: 'Leo Tolstoy',
        coverColor: 'bg-purple-200',
        filePath: '/books/h3fwq1oo9sxt9eyh4q3u5wlx-0017-anna-karenina-leo-tolstoy.epub',
        coverImage: '/covers/h3fwq1oo9sxt9eyh4q3u5wlx.jpg'
    },
    {
        id: 'epub-5',
        title: 'The Iliad',
        author: 'Homer',
        coverColor: 'bg-orange-200',
        filePath: '/books/phh3t5lv8r1v17dssn0lcwuj-0023-the-iliad-homer.epub',
        coverImage: '/covers/phh3t5lv8r1v17dssn0lcwuj.jpg'
    },
    {
        id: 'epub-6',
        title: 'Peter Pan',
        author: 'J. M. Barrie',
        coverColor: 'bg-green-200',
        filePath: '/books/tj4oyeckqgizr93cx14nz7mj-0026-peter-pan-j-m-barrie.epub',
        coverImage: '/covers/tj4oyeckqgizr93cx14nz7mj.jpg'
    },
    {
        id: 'epub-7',
        title: 'Meditations',
        author: 'Marcus Aurelius',
        coverColor: 'bg-indigo-200',
        filePath: '/books/oe5bkjmpegmldniwbcy27p2w-0027-meditations-marcus-aurelius.epub',
        coverImage: '/covers/oe5bkjmpegmldniwbcy27p2w.jpg'
    },
    {
        id: 'epub-8',
        title: 'The Autobiography of Benjamin Franklin',
        author: 'Benjamin Franklin',
        coverColor: 'bg-pink-200',
        filePath: '/books/fhsgomw0w01g6spzm19y8gv8-0030-the-autobiography-of-benjamin-franklin-benjamin-franklin-kepub.epub',
        coverImage: '/covers/fhsgomw0w01g6spzm19y8gv8.jpg'
    },
    {
        id: 'epub-9',
        title: "Gulliver's Travels",
        author: 'Jonathan Swift',
        coverColor: 'bg-teal-200',
        filePath: '/books/bkbp9nxokxzv6nj690ebnxtu-0041-gullivers-travels-jonathan-swift.epub',
        coverImage: '/covers/bkbp9nxokxzv6nj690ebnxtu.jpg'
    },
    {
        id: 'epub-10',
        title: 'Don Quixote',
        author: 'Miguel de Cervantes',
        coverColor: 'bg-amber-200',
        filePath: '/books/cnzrj4sazlgn6spcwfw5l0az-0046-don-quixote-miguel-de-cervantes.epub',
        coverImage: '/covers/cnzrj4sazlgn6spcwfw5l0az.jpg'
    },
    {
        id: 'epub-11',
        title: 'Heart of Darkness',
        author: 'Joseph Conrad',
        coverColor: 'bg-gray-300',
        filePath: '/books/maixklghgsfyytj9jzqgdbys-0053-heart-of-darkness-joseph-conrad.epub',
        coverImage: '/covers/maixklghgsfyytj9jzqgdbys.jpg'
    },
    {
        id: 'epub-12',
        title: 'The Adventures of Tom Sawyer',
        author: 'Mark Twain',
        coverColor: 'bg-lime-200',
        filePath: '/books/dyiigbcdsscm1gnj3y8iavay-0060-the-adventures-of-tom-sawyer-complete-mark-twain.epub',
        coverImage: '/covers/dyiigbcdsscm1gnj3y8iavay.jpg'
    },
    {
        id: 'epub-13',
        title: 'King James Bible',
        author: 'King James',
        coverColor: 'bg-yellow-900',
        filePath: '/books/kjv-bible.epub',
        coverImage: '' // Will be extracted or use default
    }
];

/**
 * Parse EPUB file and extract text content organized by pages (chapters)
 */
export async function parseEpubFile(filePath: string): Promise<{ fullText: string, pages: string[] }> {
    try {
        const book = ePub(filePath);
        await book.ready;

        // Get spine object
        // @ts-ignore
        const spine = book.spine;

        let fullText = '';
        const pages: string[] = [];

        // Access items array safely
        // @ts-ignore
        const items = spine.items || [];

        // Iterate through spine items
        for (const item of items) {
            try {
                if (item.href) {
                    const doc = await book.load(item.href);
                    const text = extractTextFromDocument(doc);

                    // Only add non-empty pages
                    if (text.trim().length > 0) {
                        pages.push(text);
                        fullText += text + '\n\n';
                    }
                }
            } catch (err) {
                console.error(`Failed to load chapter ${item.href}:`, err);
            }
        }

        return { fullText: fullText.trim(), pages };
    } catch (error) {
        console.error('Failed to parse EPUB:', error);
        throw error;
    }
}

/**
 * Extract text content from an EPUB document, preserving headings and structure
 */
function extractTextFromDocument(doc: any): string {
    // If it's a document object (browser environment)
    if (doc.body && doc.body.textContent) {
        const clone = doc.body.cloneNode(true);

        // 1. Handle Headings: Ensure they are surrounded by double newlines and marked with #
        const headings = clone.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach((el: any) => {
            const text = el.textContent || '';
            if (text.trim()) {
                // Replace content with marked text
                el.textContent = `\n\n# ${text.trim()}\n\n`;
            }
        });

        // 2. Handle Paragraphs and Divs: Ensure they are separated
        const blocks = clone.querySelectorAll('p, div, section, article, li');
        blocks.forEach((el: any) => {
            el.after(document.createTextNode('\n\n'));
        });

        // 3. Handle Line Breaks
        const breaks = clone.querySelectorAll('br');
        breaks.forEach((el: any) => {
            el.replaceWith(document.createTextNode('\n'));
        });

        return (clone.textContent || '').replace(/([a-zA-Z.,;?!'"])\d+/g, '$1');
    }

    // Fallback for string content
    if (typeof doc === 'string') {
        return doc
            // Convert headings to markdown style with ample whitespace
            .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n# $1\n\n')
            // Replace block tags with double newlines
            .replace(/<\/(p|div|section|article|li)>/gi, '\n\n')
            // Replace br with single newline
            .replace(/<br\s*\/?>/gi, '\n')
            // Strip script/style
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            // Strip remaining tags
            .replace(/<[^>]+>/g, ' ')
            // Decode entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // Clean up whitespace: 
            // 1. Collapse multiple newlines to max 2
            .replace(/\n{3,}/g, '\n\n')
            // 2. Collapse multiple spaces to 1
            .replace(/[ \t]+/g, ' ')
            // 3. Remove numbers attached to words or punctuation (formatting errors/footnotes)
            // Matches a letter or punctuation followed immediately by digits
            .replace(/([a-zA-Z.,;?!'"])\d+/g, '$1')
            .trim();
    }

    if (doc.textContent) {
        return doc.textContent.trim();
    }

    return '';
}

/**
 * Helper to convert Blob URL to Base64
 */
async function blobUrlToBase64(blobUrl: string): Promise<string> {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to convert blob to base64", e);
        return blobUrl; // Fallback
    }
}

/**
 * Extract cover image from EPUB
 */
export async function extractEpubCover(filePath: string): Promise<string | null> {
    try {
        const book = ePub(filePath);
        await book.ready;

        let coverUrl: string | null = null;

        // Method 1: Standard coverUrl()
        coverUrl = await book.coverUrl();

        // Method 2: Search manifest for "cover"
        if (!coverUrl) {
            // @ts-ignore
            const manifest = book.packaging.manifest;
            if (manifest) {
                const coverItem = Object.values(manifest).find((item: any) =>
                    item.properties?.includes('cover-image') ||
                    item.id.toLowerCase().includes('cover') ||
                    item.href.toLowerCase().includes('cover')
                );

                if (coverItem) {
                    // @ts-ignore
                    coverUrl = await book.archive.createUrl(coverItem.href);
                }
            }
        }

        // Method 3: First image in the book
        if (!coverUrl) {
            // @ts-ignore
            const resources = book.resources;
            // @ts-ignore
            const images = Object.values(resources?.assets || {}).filter((r: any) =>
                r.type.startsWith('image/')
            );

            if (images.length > 0) {
                // @ts-ignore
                coverUrl = await book.archive.createUrl(images[0].href);
            }
        }

        // Convert Blob URL to Base64 for persistence
        if (coverUrl && coverUrl.startsWith('blob:')) {
            return await blobUrlToBase64(coverUrl);
        }

        return coverUrl;

    } catch (e) {
        console.error("Error extracting cover:", e);
        return null;
    }
}
