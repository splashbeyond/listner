export interface PDFContent {
    pages: string[];
    fullText: string;
}

export async function extractTextFromPDF(file: File): Promise<PDFContent> {
    // Dynamically import pdfjs-dist to avoid SSR issues
    const pdfjsLib = await import("pdfjs-dist");

    // Set worker source
    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];

        // 1. Group items into lines based on Y-coordinate (with tolerance)
        const lines: any[][] = [];
        let currentLine: any[] = [];
        let lastY = -1;

        // Sort items by Y (descending) then X (ascending) to ensure reading order
        items.sort((a: any, b: any) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > 5) return yDiff; // Significant Y difference
            return a.transform[4] - b.transform[4]; // X difference
        });

        for (const item of items) {
            if (!item.str.trim() && item.width === 0) continue; // Skip invisible garbage

            const y = item.transform[5];

            if (lastY !== -1 && Math.abs(y - lastY) > (item.height || 10) * 0.5) {
                // New line
                if (currentLine.length > 0) lines.push(currentLine);
                currentLine = [];
            }
            currentLine.push(item);
            lastY = y;
        }
        if (currentLine.length > 0) lines.push(currentLine);

        // 2. Process each line with Adaptive Gap Detection
        let pageText = "";

        for (const line of lines) {
            if (line.length === 0) continue;

            // Calculate all horizontal gaps in this line
            const gaps: number[] = [];
            for (let i = 1; i < line.length; i++) {
                const prev = line[i - 1];
                const curr = line[i];
                // Gap = current X - (prev X + prev Width)
                const gap = curr.transform[4] - (prev.transform[4] + prev.width);
                gaps.push(gap);
            }

            // Determine Threshold
            // We look for the "word spacing" vs "letter spacing" split.
            let threshold = 0.2 * (line[0].height || 10); // Default fallback

            if (gaps.length > 0) {
                // Sort gaps to find the "jump"
                const sortedGaps = [...gaps].sort((a, b) => a - b);

                // We expect two main clusters: small gaps (letters) and large gaps (words).
                // We want to find the largest "gap" in the sorted values.
                let maxJump = 0;
                let splitIndex = -1;

                for (let i = 0; i < sortedGaps.length - 1; i++) {
                    const jump = sortedGaps[i + 1] - sortedGaps[i];
                    if (jump > maxJump) {
                        maxJump = jump;
                        splitIndex = i;
                    }
                }

                // If the jump is significant (relative to font size), use it as the boundary
                const fontSize = line[0].height || line[0].transform[3] || 10;
                if (maxJump > fontSize * 0.1) {
                    threshold = (sortedGaps[splitIndex] + sortedGaps[splitIndex + 1]) / 2;
                }
            }

            // Reconstruct Line Text
            let lineText = line[0].str;
            for (let i = 1; i < line.length; i++) {
                const prev = line[i - 1];
                const curr = line[i];
                const gap = curr.transform[4] - (prev.transform[4] + prev.width);

                if (gap > threshold) {
                    lineText += " " + curr.str;
                } else {
                    lineText += curr.str;
                }
            }

            pageText += lineText + "\n";
        }

        // Clean up text per page:
        // 1. Join hyphenated words (e.g. "fa- ther" -> "father")
        // 2. Collapse multiple spaces
        pageText = pageText
            .replace(/-\s+/g, "")
            .replace(/\s+/g, " ")
            .trim();

        pages.push(pageText);
    }

    return {
        pages,
        fullText: pages.join("\n\n")
    };
}

export async function extractTextWithOCR(file: File, onProgress?: (progress: number) => void): Promise<PDFContent> {
    const pdfjsLib = await import("pdfjs-dist");
    const Tesseract = (await import("tesseract.js")).default;

    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    // Initialize results array with empty strings
    const pages: string[] = new Array(totalPages).fill("");
    let completedPages = 0;

    // Create a scheduler to manage workers
    const scheduler = Tesseract.createScheduler();

    // Create 2 workers (safe for most devices)
    const workerCount = 2;
    const workers = await Promise.all(
        Array(workerCount).fill(0).map(() => Tesseract.createWorker("eng"))
    );

    workers.forEach(worker => scheduler.addWorker(worker));

    // Helper to process a single page
    const processPage = async (pageIndex: number) => {
        const page = await pdf.getPage(pageIndex);
        // Reduced scale from 2.0 to 1.5 for 2x speedup with minimal accuracy loss
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport } as any).promise;
            const imageUrl = canvas.toDataURL("image/jpeg", 0.7); // JPEG is faster to encode/decode than PNG

            const { data: { text } } = await scheduler.addJob('recognize', imageUrl);

            const cleanText = text
                .replace(/-\n/g, "")
                .replace(/\n/g, " ")
                .replace(/\s+/g, " ")
                .trim();

            pages[pageIndex - 1] = cleanText;
        }

        completedPages++;
        if (onProgress) {
            onProgress(completedPages / totalPages);
        }
    };

    // Create batches of jobs
    const pageIndices = Array.from({ length: totalPages }, (_, i) => i + 1);

    // Process all pages
    // We can just fire them all at the scheduler, it handles the queueing!
    await Promise.all(pageIndices.map(i => processPage(i)));

    await scheduler.terminate(); // Terminates all workers

    return {
        pages,
        fullText: pages.join("\n\n")
    };
}

export async function getPDFMetadata(file: File): Promise<{ title?: string; author?: string }> {
    const pdfjsLib = await import("pdfjs-dist");
    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const metadata = await pdf.getMetadata();

    return {
        title: (metadata.info as any)?.Title,
        author: (metadata.info as any)?.Author,
    };
}

export async function renderPDFCover(file: File): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist");
    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
        await page.render({ canvasContext: context, viewport } as any).promise;
        return canvas.toDataURL("image/jpeg", 0.8);
    }

    throw new Error("Could not create canvas context");
}
