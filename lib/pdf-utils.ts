export async function extractTextFromPDF(file: File): Promise<string> {
    // Dynamically import pdfjs-dist to avoid SSR issues
    const pdfjsLib = await import("pdfjs-dist");

    // Set worker source
    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + " ";
    }

    // Clean up text:
    // 1. Join hyphenated words split across lines (e.g. "fa- ther" -> "father")
    // 2. Collapse multiple spaces into single space
    return fullText
        .replace(/-\s+/g, "")
        .replace(/\s+/g, " ")
        .trim();
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
