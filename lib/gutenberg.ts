// Gutenberg API integration for fetching public domain books

export interface GutenbergBook {
    id: number;
    title: string;
    authors: Array<{ name: string; birth_year?: number; death_year?: number }>;
    subjects: string[];
    bookshelves: string[];
    languages: string[];
    formats: {
        'text/plain'?: string;
        'text/plain; charset=utf-8'?: string;
        'text/html'?: string;
        'application/epub+zip'?: string;
        'image/jpeg'?: string;
    };
    download_count: number;
}

const GUTENDEX_API = 'https://gutendex.com/books';

/**
 * Fetch popular public domain books from Project Gutenberg
 */
export async function fetchPopularBooks(limit: number = 20): Promise<GutenbergBook[]> {
    try {
        const response = await fetch(`${GUTENDEX_API}?sort=popular&languages=en&page=1`);
        const data = await response.json();
        return data.results.slice(0, limit);
    } catch (error) {
        console.error('Failed to fetch Gutenberg books:', error);
        return [];
    }
}

/**
 * Search for books by query
 */
export async function searchGutenbergBooks(query: string): Promise<GutenbergBook[]> {
    try {
        const response = await fetch(`${GUTENDEX_API}?search=${encodeURIComponent(query)}`);
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Failed to search Gutenberg books:', error);
        return [];
    }
}

/**
 * Fetch book text content
 */
export async function fetchBookText(book: GutenbergBook): Promise<string> {
    try {
        // Try to get UTF-8 plain text first, fallback to regular plain text
        let textUrl = book.formats['text/plain; charset=utf-8'] || book.formats['text/plain'];

        // If no plain text, try HTML
        if (!textUrl) {
            textUrl = book.formats['text/html'];

            if (textUrl) {
                console.log('Using HTML format for book:', book.title);
                const response = await fetch(textUrl);
                const html = await response.text();

                // Basic HTML to text conversion (strip tags)
                const text = html
                    .replace(/<style[^>]*>.*?<\/style>/gi, '')
                    .replace(/<script[^>]*>.*?<\/script>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/\s+/g, ' ');

                return cleanGutenbergText(text);
            }
        }

        if (!textUrl) {
            throw new Error('No text or HTML format available for this book');
        }

        const response = await fetch(textUrl);
        const text = await response.text();

        // Clean up the text (remove Gutenberg header/footer)
        return cleanGutenbergText(text);
    } catch (error) {
        console.error('Failed to fetch book text:', error);
        throw error;
    }
}

/**
 * Clean Gutenberg text by removing header and footer
 */
function cleanGutenbergText(text: string): string {
    // Remove Project Gutenberg header (everything before "*** START OF")
    const startMarker = /\*\*\* START OF (THIS|THE) PROJECT GUTENBERG EBOOK .+ \*\*\*/i;
    const startMatch = text.match(startMarker);

    if (startMatch) {
        text = text.substring(startMatch.index! + startMatch[0].length);
    }

    // Remove Project Gutenberg footer (everything after "*** END OF")
    const endMarker = /\*\*\* END OF (THIS|THE) PROJECT GUTENBERG EBOOK .+ \*\*\*/i;
    const endMatch = text.match(endMarker);

    if (endMatch) {
        text = text.substring(0, endMatch.index);
    }

    // Trim whitespace
    return text.trim();
}

/**
 * Convert Gutenberg book to our app's book format
 */
export function convertToAppBook(gutenbergBook: GutenbergBook, content?: string) {
    const author = gutenbergBook.authors[0]?.name || 'Unknown Author';
    const coverImage = gutenbergBook.formats['image/jpeg'];

    return {
        id: `gutenberg-${gutenbergBook.id}`,
        title: gutenbergBook.title,
        author: author,
        content: content || '',
        coverImage: coverImage,
        coverColor: getRandomCoverColor(),
        source: 'Project Gutenberg',
        downloadCount: gutenbergBook.download_count,
        subjects: gutenbergBook.subjects,
    };
}

/**
 * Get a random cover color for books without cover images
 */
function getRandomCoverColor(): string {
    const colors = [
        'bg-blue-200',
        'bg-red-200',
        'bg-green-200',
        'bg-pink-200',
        'bg-yellow-200',
        'bg-indigo-200',
        'bg-purple-200',
        'bg-orange-200',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Curated list of popular classic book IDs
 */
export const POPULAR_CLASSICS = [
    1342, // Pride and Prejudice - Jane Austen
    11,   // Alice's Adventures in Wonderland - Lewis Carroll
    1661, // The Adventures of Sherlock Holmes - Arthur Conan Doyle
    84,   // Frankenstein - Mary Shelley
    345,  // Dracula - Bram Stoker
    1952, // The Yellow Wallpaper - Charlotte Perkins Gilman
    2701, // Moby Dick - Herman Melville
    1080, // A Modest Proposal - Jonathan Swift
    174,  // The Picture of Dorian Gray - Oscar Wilde
    98,   // A Tale of Two Cities - Charles Dickens
    1400, // Great Expectations - Charles Dickens
    16,   // Peter Pan - J. M. Barrie
    74,   // The Adventures of Tom Sawyer - Mark Twain
    76,   // Adventures of Huckleberry Finn - Mark Twain
    1260, // Jane Eyre - Charlotte Brontë
    768,  // Wuthering Heights - Emily Brontë
    2554, // Crime and Punishment - Fyodor Dostoyevsky
    1184, // The Count of Monte Cristo - Alexandre Dumas
    244,  // A Study in Scarlet - Arthur Conan Doyle
    1232, // The Prince - Niccolò Machiavelli
];

/**
 * Fetch a specific book by ID
 */
export async function fetchBookById(id: number): Promise<GutenbergBook | null> {
    try {
        const response = await fetch(`${GUTENDEX_API}/${id}`);
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch book ${id}:`, error);
        return null;
    }
}
