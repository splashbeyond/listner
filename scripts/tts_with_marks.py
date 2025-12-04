#!/usr/bin/env python3
"""
Generate TTS audio with word-level timing marks using edge-tts
"""
import asyncio
import sys
import json
import edge_tts

async def generate_tts_with_marks(text: str, voice: str, rate: str, output_file: str):
    """Generate TTS and extract word marks"""
    marks = []
    
    # Create communicate object
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    
    # Generate audio and collect marks
    with open(output_file, 'wb') as audio_file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # Word boundary event contains timing information
                marks.append({
                    "text": chunk.get("text", ""),
                    "offset": chunk.get("offset", 0),
                    "duration": chunk.get("duration", 0)
                })
    
    # Output marks as JSON to stdout
    print(json.dumps(marks))

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: tts_with_marks.py <text> <voice> <rate> <output_file>", file=sys.stderr)
        sys.exit(1)
    
    text = sys.argv[1]
    voice = sys.argv[2]
    rate = sys.argv[3]
    output_file = sys.argv[4]
    
    asyncio.run(generate_tts_with_marks(text, voice, rate, output_file))
