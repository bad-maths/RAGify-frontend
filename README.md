# Multi-Model RAG App Frontend

This is the **frontend** for the [Multi-Model RAG Application](https://github.com/bad-maths/multi-model-rag-app), a graduation project implementing Retrieval-Augmented Generation (RAG) with support for multiple LLM providers and vector databases.

## Project Overview
This web application provides a modern, user-friendly interface for interacting with the RAG backend. Users can upload documents, select active projects, and chat with an AI assistant that answers questions based on their uploaded files.

## Tech Stack
- **Next.js** (React framework)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** and **Radix UI** (UI components)
- **React Context & Hooks**
- **react-markdown** (Markdown rendering)
- **Other libraries:** date-fns, recharts, embla-carousel, sonner, lucide-react, and more

## Features
- **Authentication:** Secure login and registration
- **File Upload:** Upload documents for analysis
- **File Management:** Manage and switch between multiple uploaded files
- **Chat Interface:** Chat with an AI assistant about your uploaded documents
- **Streaming Responses:** See bot responses stream in real-time
- **Markdown Support:** Rich text answers with markdown rendering
- **Theme Support:** Light/dark mode toggle
- **Responsive Design:** Works on desktop and mobile

## Usage
This frontend is designed to work with the [Multi-Model RAG App backend](https://github.com/bad-maths/multi-model-rag-app). Make sure to set the `NEXT_PUBLIC_API_URL` environment variable to point to your backend API.

---

**Graduation Project** — MIT License 