import fs from 'fs';
import path from 'path';

// Manual env parser
function parseEnv(content: string) {
    const env: Record<string, string> = {};
    const lines = content.split('\n');
    for (const line of lines) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
    }
    return env;
}

const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envConfig = parseEnv(envContent);
    apiKey = envConfig.OPENROUTER_API_KEY;
} catch (e) {
    console.error("Could not read .env.local file");
    process.exit(1);
}

if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY not found in .env.local");
    process.exit(1);
}

console.log("✅ Found OPENROUTER_API_KEY:", apiKey.substring(0, 10) + "...");

async function testOpenRouter() {
    const models = [
        "perplexity/llama-3.1-sonar-large-128k-online",
        "perplexity/llama-3-sonar-large-32k-online",
        "perplexity/sonar-reasoning",
        "perplexity/sonar"
    ];

    for (const model of models) {
        console.log(`\nTesting model: ${model}...`);
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://listener.app",
                    "X-Title": "Listener App"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: "user", content: "Hello, are you working?" }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Failed: ${response.status} ${response.statusText}`);
                console.error("Error details:", errorText);
                continue;
            }

            const data = await response.json();
            console.log(`✅ Success with ${model}!`);
            console.log("Response:", data.choices[0]?.message?.content);
            return; // Exit on first success

        } catch (error) {
            console.error("❌ Network or other error:", error);
        }
    }
    console.log("\n❌ All models failed.");
}

testOpenRouter();
