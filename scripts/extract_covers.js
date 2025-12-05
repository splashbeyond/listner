const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const booksDir = path.join(__dirname, '../public/books');
const coversDir = path.join(__dirname, '../public/covers');

if (!fs.existsSync(coversDir)) {
    fs.mkdirSync(coversDir, { recursive: true });
}

const files = fs.readdirSync(booksDir).filter(f => f.endsWith('.epub'));

files.forEach(file => {
    const id = file.split('-')[0]; // Extract ID from filename
    const epubPath = path.join(booksDir, file);

    try {
        // List files to find the cover image
        const listOutput = execSync(`unzip -l "${epubPath}"`).toString();
        const lines = listOutput.split('\n');

        // Look for cover.jpg or similar
        // The output of unzip -l is like: "    91  09-10-2024 05:56   epub/css/pdl/cover.css"
        // We need to extract the last part

        const findPath = (pattern) => {
            const line = lines.find(l => pattern.test(l));
            if (line) {
                // Split by spaces and take the last part, but handle spaces in filenames if necessary (though unlikely here)
                // unzip -l output is fixed width for size/date, but filename is at the end.
                // A simple split might fail if filename has spaces, but let's assume standard epub structure for now.
                const parts = line.trim().split(/\s+/);
                // The filename starts after the time (4th column usually)
                // Length Date Time Name
                // 3799950  09-10-2024 05:56   epub/images/cover.jpg
                return parts.slice(3).join(' ');
            }
            return null;
        };

        let coverPath = findPath(/epub\/images\/cover\.jpg/);
        if (!coverPath) coverPath = findPath(/images\/cover\.jpg/);
        if (!coverPath) coverPath = findPath(/cover\.jpg/i);
        if (!coverPath) coverPath = findPath(/cover\.jpeg/i);
        if (!coverPath) coverPath = findPath(/cover\.png/i);

        if (coverPath) {
            console.log(`Found cover for ${file}: ${coverPath}`);
            // Extract to stdout and pipe to file
            execSync(`unzip -p "${epubPath}" "${coverPath}" > "${path.join(coversDir, id + '.jpg')}"`);
        } else {
            console.log(`No cover found for ${file}`);
        }
    } catch (e) {
        console.error(`Error processing ${file}:`, e.message);
    }
});
