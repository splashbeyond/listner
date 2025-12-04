const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const KEY = "eXHKO8NpBMP1Jo0qULzIzVoaMPgqaXX3";
const SECRET = "IEdG5jx2ypu4pVJO5nJIwbw9rGuLP2ZmIzI7QgwYYLx716PZAAzyet348qaSqylN";

async function main() {
    console.log("Testing InWorld AI TTS REST API...");

    // Construct Basic Auth Header
    const authHeader = "Basic " + Buffer.from(`${KEY}:${SECRET}`).toString('base64');

    // Trying the TTS endpoint directly
    // Documentation suggests: POST https://api.inworld.ai/tts/v1/voice
    // Or potentially: https://api.inworld.ai/v1/tts

    const endpoints = [
        "https://api.inworld.ai/tts/v1/voice",
        "https://api.inworld.ai/v1/tts",
        "https://api.inworld.ai/studio/v1/tts"
    ];

    for (const endpoint of endpoints) {
        console.log(`Trying endpoint: ${endpoint}`);
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: "Hello, this is a test of the InWorld AI text to speech system.",
                    voice: "Ashley", // Trying "voice" instead of "voiceId" based on some docs
                    model: "inworld-tts-1",
                    format: "mp3"
                })
            });

            if (response.ok) {
                console.log(`SUCCESS! Endpoint ${endpoint} worked.`);
                console.log("Status:", response.status);
                // We found the working endpoint!
                return;
            } else {
                console.error(`Failed: ${response.status} ${response.statusText}`);
                console.error(await response.text());
            }
        } catch (e) {
            console.error("Error:", e.message);
        }
    }
}

main();
