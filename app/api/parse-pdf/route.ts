import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Create a unique temp file path
        const tempDir = os.tmpdir();
        const tempFilePath = join(tempDir, `upload-${Date.now()}.pdf`);

        // Write the file to disk
        await writeFile(tempFilePath, buffer);

        // Path to the python script
        const scriptPath = join(process.cwd(), "scripts", "parse_pdf.py");

        // Execute the python script
        // We use '/usr/bin/python3' to be explicit
        // Increase maxBuffer to 50MB to handle large books
        const { stdout, stderr } = await execAsync(`/usr/bin/python3 "${scriptPath}" "${tempFilePath}"`, { maxBuffer: 1024 * 1024 * 50 });

        // Clean up the temp file
        await unlink(tempFilePath);

        if (stderr) {
            console.error("Python script stderr:", stderr);
        }

        try {
            const result = JSON.parse(stdout);
            if (result.error) {
                return NextResponse.json({ error: result.error }, { status: 500 });
            }
            return NextResponse.json(result);
        } catch (e) {
            console.error("Failed to parse Python output:", stdout);
            return NextResponse.json({ error: "Failed to parse PDF content" }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
