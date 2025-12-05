---
description: Battleplan for building the AI Novel Creation Interface
---

# AI Novel Creation Battleplan

## Objective
Enable users to co-create novels with an AI assistant (Claude) through a chat interface, and automatically save the generated book to the library in a compatible format.

## Architecture

### 1. Frontend (`app/create/page.tsx`)
*   **Chat Interface**: Existing scaffold needs to be connected to a real backend.
*   **State Management**: Track conversation history (`messages`).
*   **Actions**:
    *   `sendMessage`: Send user input to AI.
    *   `generateBook`: Trigger the final book generation process.
*   **Transitions**: Redirect to `/reader/[id]` upon successful creation.

### 2. Backend (`app/api/chat/route.ts`)
*   **Role**: Proxy requests to Anthropic API (Claude).
*   **Endpoints**:
    *   `POST /api/chat`: Handles conversational turns.
    *   `POST /api/generate-book`: Handles the final structured output generation.
*   **System Prompt**: Needs to define the AI's persona as a "Creative Writing Partner" and enforce structured output when requested.

### 3. Data Format & Storage
*   **Target Format** (`BookData` in `lib/db.ts`):
    ```typescript
    interface BookData {
        id: string;
        title: string;
        author: string;
        content: string; // Full text combined
        pages: string[]; // Chapter content
        coverImage?: string; // Optional, maybe generated later
    }
    ```
*   **AI Output Schema** (JSON):
    ```json
    {
        "title": "Book Title",
        "author": "User & AI",
        "description": "Short summary...",
        "chapters": [
            {
                "title": "Chapter 1",
                "content": "Full text of chapter 1..."
            }
        ]
    }
    ```

## Implementation Steps

### Phase 1: Infrastructure Setup
1.  [ ] Install `@anthropic-ai/sdk`.
2.  [ ] Create `app/api/chat/route.ts` to handle standard conversation.
3.  [ ] Create `app/api/generate-book/route.ts` to handle JSON generation.

### Phase 2: Frontend Integration
1.  [ ] Connect `app/create/page.tsx` to the chat API.
2.  [ ] Implement the "Generate Book" button logic.
3.  [ ] Add loading states and error handling.

### Phase 3: Book Processing & Saving
1.  [ ] Parse the JSON output from the AI.
2.  [ ] Convert JSON structure to `BookData` format (join chapters for full content).
3.  [ ] Save to IndexedDB using `saveBookToDB`.
4.  [ ] Redirect user to the new book in the Reader.

### Phase 4: Polish
1.  [ ] Add "System Instructions" to guide the AI's style.
2.  [ ] (Optional) Auto-generate a cover image description and use a placeholder or generate one.

## Questions/Dependencies
*   **API Key**: We need an `ANTHROPIC_API_KEY` in `.env.local`.
