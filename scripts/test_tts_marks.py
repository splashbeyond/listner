import asyncio
import edge_tts
import json
import sys

TEXT = "Hello, this is a test of the immersive reading mode."
VOICE = "en-US-AriaNeural"
RATE = "+0%"

async def main():
    communicate = edge_tts.Communicate(TEXT, VOICE, rate=RATE)
    
    audio_data = b""
    marks = []

    async for chunk in communicate.stream():
        if chunk["type"] != "audio":
            print(f"Chunk: {chunk}", file=sys.stderr)
        
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            marks.append({
                "offset": chunk["offset"],
                "duration": chunk["duration"],
                "text": chunk["text"]
            })

    print(json.dumps({"marks": marks, "audio_len": len(audio_data)}))

if __name__ == "__main__":
    asyncio.run(main())
