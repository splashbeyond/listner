---
description: Implementation Plan for AI Book Creation Feature (Part 2)
---

# AI Book Creation Feature - Implementation Plan

## Overview
Allow users to create custom books by conversing with Claude AI. The generated books will be automatically saved to the library and support all existing features (TTS, Immersive Mode, AI explanations).

## Design Aesthetic
- **Match existing app style**: Dark gradient background (brown → navy → dark)
- **NewGenre-inspired**: Clean, elegant, minimal design
- **Consistent navigation**: Same nav bar with Listener branding
- **Serif typography**: For book content and headings
- **Smooth animations**: Framer Motion transitions

## User Flow

### 1. Entry Point
- Add "Create Book" button/link in navigation bar
- Route: `/create` or `/create-book`
- Accessible from home page and library page

### 2. Chat Interface
- **Layout**: Full-screen chat interface with dark gradient background
- **Components**:
  - Message history (scrollable)
  - Input field for user messages
  - Send button
  - "Generate Book" button (appears after sufficient conversation)
  - Progress indicator during generation

### 3. Conversation Flow
- User describes what book they want to create:
  - Topic/subject matter
  - Genre (fiction, non-fiction, educational, etc.)
  - Style/tone (formal, casual, poetic, technical)
  - Length (short story, novella, full book)
  - Target audience
  - Specific chapters/sections desired
- Claude asks clarifying questions
- User refines their vision through dialogue

### 4. Book Generation
- User clicks "Generate Book" when ready
- Show loading state with progress indicator
- Claude generates the complete book content
- Format into chapters/sections
- Create book metadata (title, author, description)

### 5. Save to Library
- Automatically save generated book to IndexedDB
- Generate unique book ID
- Create book object with:
  - `id`: unique identifier
  - `title`: extracted from conversation or generated
  - `author`: "AI Generated" or custom
  - `content`: full book text
  - `coverColor`: random gradient or AI-suggested
  - `createdAt`: timestamp
  - `generatedBy`: "Claude AI"

### 6. Post-Generation
- Show success message
- Offer options:
  - "Read Now" → Navigate to reader
  - "View in Library" → Navigate to library
  - "Create Another" → Reset chat

## Technical Implementation

### Backend (API Routes)

#### `/api/claude/chat` - POST
- **Purpose**: Send messages to Claude and get responses
- **Input**: 
  ```typescript
  {
    messages: Array<{role: 'user' | 'assistant', content: string}>,
    conversationId?: string
  }
  ```
- **Output**:
  ```typescript
  {
    response: string,
    conversationId: string
  }
  ```
- **Implementation**:
  - Use Anthropic SDK
  - Maintain conversation context
  - System prompt to guide book creation

#### `/api/claude/generate-book` - POST
- **Purpose**: Generate complete book from conversation
- **Input**:
  ```typescript
  {
    conversationHistory: Array<{role: string, content: string}>,
    preferences: {
      length?: string,
      style?: string,
      genre?: string
    }
  }
  ```
- **Output**:
  ```typescript
  {
    title: string,
    author: string,
    content: string,
    chapters?: Array<{title: string, content: string}>,
    metadata: {
      genre: string,
      wordCount: number,
      generatedAt: string
    }
  }
  ```

### Frontend Components

#### `/app/create/page.tsx`
- Main chat interface page
- Dark gradient background matching home/library
- Fixed navigation bar
- Chat container with message history
- Input area at bottom

#### `/components/ChatMessage.tsx`
- Individual message component
- Different styling for user vs AI messages
- Smooth fade-in animations
- Support for markdown formatting

#### `/components/BookGenerationProgress.tsx`
- Loading state during book generation
- Progress bar or animated indicator
- Status messages ("Generating chapters...", "Finalizing content...")

#### `/components/GeneratedBookPreview.tsx`
- Preview of generated book before saving
- Show title, estimated length, chapter list
- Edit options (title, author name)
- Save/Discard buttons

### Data Flow

```
User Input → Chat API → Claude Response → Display
                                ↓
                        Conversation History
                                ↓
                    "Generate Book" Button
                                ↓
                    Generate Book API → Claude
                                ↓
                        Format & Structure
                                ↓
                        Save to IndexedDB
                                ↓
                        Redirect to Library/Reader
```

### State Management

#### Chat State
```typescript
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  conversationId: string;
  canGenerateBook: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
```

#### Generation State
```typescript
interface GenerationState {
  isGenerating: boolean;
  progress: number;
  status: string;
  generatedBook?: GeneratedBook;
}

interface GeneratedBook {
  title: string;
  author: string;
  content: string;
  chapters: Chapter[];
  metadata: BookMetadata;
}
```

## Claude System Prompts

### Chat System Prompt
```
You are a creative writing assistant helping users create custom books. 
Your role is to:
1. Ask clarifying questions about the book they want to create
2. Understand their vision for topic, style, length, and audience
3. Suggest improvements and creative ideas
4. Guide them through the book creation process

Be conversational, encouraging, and creative. Help them refine their ideas.
```

### Book Generation System Prompt
```
Based on the conversation history, generate a complete book that matches 
the user's specifications. 

Format the book with:
- A compelling title
- Clear chapter divisions (if applicable)
- Consistent style and tone
- Proper narrative structure
- Engaging content throughout

Output in a structured format with chapters and content clearly marked.
```

## UI/UX Considerations

### Chat Interface Design
- **Message bubbles**: User (right, light), AI (left, slightly darker)
- **Typing indicator**: Animated dots when AI is responding
- **Scroll behavior**: Auto-scroll to latest message
- **Input field**: Fixed at bottom, expands with text
- **Send button**: Disabled when empty or loading

### Visual Hierarchy
- **Navigation**: Fixed at top (consistent with rest of app)
- **Chat area**: Main focus, centered, max-width container
- **Input area**: Always visible at bottom
- **Action buttons**: Prominent "Generate Book" when ready

### Animations
- **Message appearance**: Fade in from bottom
- **Typing indicator**: Pulse animation
- **Book generation**: Progress bar with smooth transitions
- **Success state**: Celebration animation (confetti or checkmark)

## Error Handling

### API Errors
- Network failures: Retry mechanism with user notification
- Claude API errors: Graceful fallback messages
- Rate limiting: Queue messages or show wait time

### Generation Errors
- Incomplete generation: Save partial content, allow retry
- Formatting errors: Fallback to plain text
- Timeout: Show progress, allow cancellation

### User Experience
- Clear error messages
- Retry buttons
- Save conversation history (don't lose progress)
- Draft saving (auto-save conversation state)

## Future Enhancements (Not Part of Initial Build)
- Book templates/presets
- Multi-language support
- Image generation for covers
- Export to PDF/EPUB
- Collaborative editing
- Version history
- Share generated books

## Dependencies
- `@anthropic-ai/sdk`: Claude API integration
- Existing: `framer-motion`, `lucide-react`, IndexedDB utils
- No new major dependencies needed

## Environment Variables Needed
```
ANTHROPIC_API_KEY=your_claude_api_key_here
```

## Testing Checklist
- [ ] Chat interface loads correctly
- [ ] Messages send and receive properly
- [ ] Conversation context is maintained
- [ ] Book generation completes successfully
- [ ] Generated book saves to library
- [ ] Generated book opens in reader
- [ ] TTS works on generated content
- [ ] Immersive mode works on generated content
- [ ] AI explanations work on generated content
- [ ] Error states display correctly
- [ ] Loading states are smooth
- [ ] Mobile responsive design

## Implementation Order
1. Create `/create` page with basic layout
2. Build chat UI components
3. Implement `/api/claude/chat` endpoint
4. Connect chat UI to API
5. Add conversation state management
6. Implement "Generate Book" trigger logic
7. Build `/api/claude/generate-book` endpoint
8. Create book generation progress UI
9. Implement save to library functionality
10. Add success/redirect flow
11. Polish animations and transitions
12. Test end-to-end flow
13. Handle edge cases and errors

---

**Status**: Planning Phase - Ready to Build
**Estimated Time**: 4-6 hours for full implementation
**Priority**: High - Core feature for Part 2
