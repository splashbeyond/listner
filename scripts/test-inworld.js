const { InworldClient } = require('@inworld/nodejs-sdk');

const KEY = "eXHKO8NpBMP1Jo0qULzIzVoaMPgqaXX3";
const SECRET = "IEdG5jx2ypu4pVJO5nJIwbw9rGuLP2ZmIzI7QgwYYLx716PZAAzyet348qaSqylN";

async function main() {
    const client = new InworldClient().setApiKey({
        key: KEY,
        secret: SECRET,
    });

    console.log("Client created. Attempting to list scenes...");

    // I don't see a direct "listScenes" on the client in the basic docs.
    // Usually you need a scene ID to start a session.
    // Let's try to generate a token first to verify creds.

    try {
        const token = await client.generateSessionToken();
        console.log("Token generated successfully!");
        console.log("Session ID:", token.sessionId);
        // console.log("Token:", token.token);
    } catch (error) {
        console.error("Error generating token:", error);
    }
}

main();
