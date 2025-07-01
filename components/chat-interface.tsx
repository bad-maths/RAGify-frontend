"use client"

import type React from "react"
import ReactMarkdown from "react-markdown"

import { useState, useRef, useEffect } from "react"
import { useProject } from "@/hooks/use-project"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Paperclip, User, Bot, AlertCircle, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI assistant. Ask me anything about your uploaded documents.",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [streamedMessage, setStreamedMessage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { projectId, setProjectId } = useProject()
  const { logout } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-scroll when streamedMessage updates (for bot typing effect)
  useEffect(() => {
    if (isThinking && streamedMessage !== null) {
      scrollToBottom()
    }
  }, [streamedMessage, isThinking])

  useEffect(() => {
    const fetchProjects = async () => {
      const token = localStorage.getItem("access_token")
      if (!token) return
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/rag/list_projects`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setProjects(data.map((p: any) => ({
            id: p.project_id,
            name: p.file_name
          })))
        }
      } catch (err) {
       
      }
    }
    fetchProjects()
  }, [])

  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id)
      setMessages([
        {
          id: Date.now().toString(),
          content: `Ready! You can now ask me about "${projects[0].name}".`,
          sender: "bot",
          timestamp: new Date(),
        },
      ])
    }
    // Only run when projects or projectId changes
  }, [projects, projectId, setProjectId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || isThinking) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setIsThinking(true)
    setStreamedMessage(null) // <-- Ensure this is null before fetch
    setError("")

    try {
      const token = localStorage.getItem("access_token")
      if (!token || !projectId) {
        throw new Error("Not authenticated or no project selected")
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/rag/ask/${projectId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: userMessage.content }),
      })

      if (response.status === 401) {
        logout()
        throw new Error("Session expired. Please login again.")
      }

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()
      console.log("Full prompt from backend:", data["full_prompt"])
      const answer = data.answer || "Sorry, I couldn't process your request."

      // Simple typing effect
      let current = ""
      for (let i = 0; i < answer.length; i++) {
        current += answer[i]
        setStreamedMessage(current)
        await new Promise((res) => setTimeout(res, 30))
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: answer,
        sender: "bot",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
      setStreamedMessage(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setStreamedMessage(null)
    } finally {
      setIsLoading(false)
      setIsThinking(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setIsUploading(true)
      setError("")

      const formData = new FormData()
      formData.append("file", file)

      try {
        const token = localStorage.getItem("access_token")
        if (!token) {
          throw new Error("You are not authenticated")
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/rag/upload_file`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("access_token")
            window.location.href = "/login"
            throw new Error("Authentication expired. Please login again.")
          }
          const errorData = await response.json()
          throw new Error(errorData.detail || "Failed to upload file")
        }

        const data = await response.json()

        const userMessage: Message = {
          id: Date.now().toString(),
          content: `Uploaded file: ${file.name}`,
          sender: "user",
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])

        if (data.project_id && data.project_id !== projectId) {
          setProjectId(data.project_id)
          setProjects(prev =>
            prev.some(p => p.id === data.project_id)
              ? prev
              : [...prev, { id: data.project_id, name: file.name }]
          )
          setMessages([
            {
              id: Date.now().toString(),
              content: `You can now ask me about "${file.name}".`,
              sender: "bot",
              timestamp: new Date(),
            },
          ])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload file")
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <Card className="flex-1 flex flex-col">
        {/* Sticky file selector - always visible at the top of the card */}
        <div className="z-20 sticky top-0 bg-background pb-4 flex items-center gap-3 border-b border-border px-4 pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="font-medium">Active file:</span>
          </div>
          <Select
            value={projectId || ""}
            onValueChange={(value) => {
              const selected = projects.find(p => p.id === value)
              setProjectId(selected?.id || "")
              setMessages([
                {
                  id: Date.now().toString(),
                  content: selected
                    ? `Ready! You can now ask me about "${selected.name}".`
                    : "Please select a file to start.",
                  sender: "bot",
                  timestamp: new Date(),
                },
              ])
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a file to analyze" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CardContent className="flex-1 p-4 flex flex-col">
          {/* Scrollable chat area */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Start a conversation by sending a message or uploading a file
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex items-start gap-2 max-w-[80%] ${
                        message.sender === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {message.sender === "user" ? (
                          <User className="h-5 w-5" />
                        ) : (
                          <Bot className="h-5 w-5" />
                        )}
                      </div>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <div className="prose prose-sm break-words max-w-none" dir="auto">
                          <ReactMarkdown>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {isThinking && streamedMessage === null && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[80%] flex-row">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="rounded-lg px-4 py-2 bg-muted flex items-center min-h-[2.5rem]">
                      {/* Spinning wheel */}
                      <span className="animate-spin inline-block h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
                      <span className="text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {isThinking && streamedMessage !== null && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[80%] flex-row">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="rounded-lg px-4 py-2 bg-muted">
                      <div className="prose prose-sm break-words max-w-none" dir="auto">
                        <ReactMarkdown>
                          {streamedMessage + "▍"}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

          </ScrollArea>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isUploading && (
            <div className="flex items-center gap-2 mb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Uploading file...</span>
            </div>
          )}

          <div className="pt-4 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isThinking}
            >
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isUploading || isThinking}
              className="flex-1"
              dir="auto"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isUploading || isThinking}
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.txt,.png,.jpg"
            />
          </div>
          
        </CardContent>
      </Card>
    </div>
  )
}
