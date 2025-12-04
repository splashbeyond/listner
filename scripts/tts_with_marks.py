#!/usr/bin/env python3
"""
Generate TTS audio with word-level timing marks using edge-tts SubMaker
"""
import asyncio
import sys
import json
import edge_tts
from edge_tts import SubMaker
import subprocess

async def generate_tts_with_marks(text: str, voice: str, rate: str, output_file: str):
    """Generate TTS and extract word marks using SubMaker"""
    
    # Create SubMaker to collect timing information
    sub_maker = SubMaker()
    
    # Create communicate object
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    
    # Generate audio and collect timing data
    with open(output_file, 'wb') as audio_file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # Feed word boundary to SubMaker
                sub_maker.feed(chunk["offset"], chunk["text"])
                print(f"[DEBUG] WordBoundary: {chunk['text']} @ {chunk['offset']}", file=sys.stderr)
    
    # Extract word marks from SubMaker
    marks = []
    cues = sub_maker.cues
    
    if len(cues) > 0:
        # We have real word boundaries!
        for i, (offset, word_text) in enumerate(cues):
            if i < len(cues) - 1:
                duration = cues[i + 1][0] - offset
            else:
                duration = 5000000  # 500ms for last word
            
            marks.append({
                "text": word_text,
                "offset": offset,
                "duration": duration
            })
    else:
        # Fallback: Estimate word timings based on average speaking rate
        print("[DEBUG] No WordBoundary events, using fallback estimation", file=sys.stderr)
        
        # TTS speaks much faster than humans - roughly 200-250 words per minute
        # That's about 4 words per second, or 250ms per word average
        words = text.split()
        if len(words) > 0:
            # Start after a small delay
            current_offset = 500000  # 50ms initial delay
            
            for word in words:
                # Estimate duration based on word length
                # Very short words (1-2 chars): 150ms
                # Short words (3-5 chars): 200ms  
                # Medium words (6-8 chars): 250ms
                # Long words (9+ chars): 300ms + 20ms per extra char
                char_count = len(word)
                
                if char_count <= 2:
                    duration_ms = 150
                elif char_count <= 5:
                    duration_ms = 200
                elif char_count <= 8:
                    duration_ms = 250
                else:
                    duration_ms = 300 + ((char_count - 8) * 20)
                
                # Add punctuation pause to the word's duration (not the gap)
                # This makes the highlight stay on the word during the pause
                punctuation_pause_ms = 0
                if word.endswith('.') or word.endswith('!') or word.endswith('?'):
                    punctuation_pause_ms = 250  # 250ms pause after sentence-ending punctuation
                elif word.endswith(',') or word.endswith(';') or word.endswith(':'):
                    punctuation_pause_ms = 100  # 100ms pause after commas
                elif word.endswith('—') or word.endswith('–'):
                    punctuation_pause_ms = 75   # 75ms pause after dashes
                
                total_duration_ms = duration_ms + punctuation_pause_ms
                duration_ticks = total_duration_ms * 10000  # Convert ms to 100ns ticks
                
                marks.append({
                    "text": word,
                    "offset": current_offset,
                    "duration": duration_ticks
                })
                
                # Just add a small gap between words
                gap = 500000  # 50ms base gap
                current_offset += duration_ticks + gap
    
    print(f"[DEBUG] Total marks collected: {len(marks)}", file=sys.stderr)
    
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
