"use client"

import type React from "react"
import { useWorkflow } from "@/hooks/use-workflow"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"

const Send = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
)

const Paperclip = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
)

const Tag = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <path d="M7 7h.01" />
  </svg>
)

const Zap = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
  </svg>
)

export function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      id: "system-1",
      role: "assistant" as const,
      content:
        "まず課題の概要を教えてください。ビジネス課題からPain分析、ソリューション設計まで一気通貫でサポートします。",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [phaseAnimation, setPhaseAnimation] = useState("")

  const { stages, context, isRunning, startWorkflow, currentPhase } = useWorkflow()

  useEffect(() => {
    if (isRunning && currentPhase) {
      let dots = 0
      const interval = setInterval(() => {
        dots = (dots + 1) % 4
        setPhaseAnimation(`${currentPhase} ${".".repeat(dots)}`)
      }, 100)

      return () => clearInterval(interval)
    } else {
      setPhaseAnimation("")
    }
  }, [isRunning, currentPhase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isRunning || isComposing) return

    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: context,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ""

      const assistantId = Date.now().toString()
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
        },
      ])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const data = JSON.parse(line.slice(2))
                if (data.type === "text-delta") {
                  assistantMessage += data.text
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? { ...msg, content: assistantMessage.replace(/###\s*/g, "").replace(/\*\*(.*?)\*\*/g, "$1") }
                        : msg,
                    ),
                  )
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      }

      if (!assistantMessage) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content:
                    "すみません、現在AIサービスに接続できません。OpenAI APIキーが設定されているか確認してください。",
                }
              : msg,
          ),
        )
      }

      if (assistantMessage.includes("課題") || assistantMessage.includes("問題") || input.includes("Pain")) {
        setTimeout(() => {
          startWorkflow(input)
        }, 1000)
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.role === "assistant" && msg.content === ""
            ? { ...msg, content: "エラーが発生しました。OpenAI APIキーが正しく設定されているか確認してください。" }
            : msg,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleAIExecution = async () => {
    if (!input.trim()) return

    await startWorkflow(input)
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (isComposing) {
        setIsComposing(false)
      } else {
        handleSubmit(e)
      }
    }
  }

  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = () => {
    setIsComposing(false)
  }

  const TimeStamp = () => {
    const [time, setTime] = useState("")
    useEffect(() => {
      setTime(new Date().toLocaleTimeString())
    }, [])
    return <span suppressHydrationWarning>{time}</span>
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-lg" style={{ color: "#1e40af" }}>
              🧠
            </span>
          </div>
          <div>
            <h2 className="font-medium">コンサル型AI</h2>
            <p className="text-xs text-muted-foreground">
              {phaseAnimation ||
                (isRunning
                  ? `実行中: ${stages.find((s) => s.status === "running")?.name || "準備中"}`
                  : "Mode: general")}{" "}
              | ctx: problem.yaml / personas / logs
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-h-[45vh]">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <Card
                className={`max-w-[80%] p-4 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-70 mt-2">
                  <TimeStamp />
                </p>
              </Card>
            </div>
          ))}
          {(isLoading || isRunning) && (
            <div className="flex justify-start">
              <Card className="bg-card p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-sm text-muted-foreground">{phaseAnimation || "分析中..."}</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background px-4 py-3 overflow-x-auto whitespace-nowrap">
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground mr-2">Pain:</span>
          {context.painAnalysis?.pains.map((pain, index) => (
            <span
              key={pain.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: pain.severity === "high" ? "#dc2626" : "#d97706",
                color: "#ffffff",
                border: `1px solid ${pain.severity === "high" ? "#dc2626" : "#d97706"}`,
              }}
            >
              {pain.severity === "high" ? "●" : "○"}
              {pain.id} {pain.title}
            </span>
          )) || (
            <>
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "1px solid #dc2626",
                }}
              >
                ●P-001 可視化不足
              </span>
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "#d97706",
                  color: "#ffffff",
                  border: "1px solid #d97706",
                }}
              >
                ○P-002 粒度不整合
              </span>
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "#d97706",
                  color: "#ffffff",
                  border: "1px solid #d97706",
                }}
              >
                ○P-003 面談調整遅延
              </span>
            </>
          )}
          <Button variant="link" size="sm" className="text-xs">
            すべて見る
          </Button>

          <span className="text-xs text-muted-foreground ml-4 mr-2">Agents:</span>
          {context.agentGeneration?.agents.map((agent, index) => (
            <span
              key={agent.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "1px solid #2563eb",
              }}
            >
              {agent.name}
            </span>
          )) || (
            <>
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "1px solid #2563eb",
                }}
              >
                resume-parser
              </span>
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "1px solid #2563eb",
                }}
              >
                skill-normalizer
              </span>
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "1px solid #2563eb",
                }}
              >
                matcher-core
              </span>
            </>
          )}
          <Button variant="link" size="sm" className="text-xs">
            一括Manifest
          </Button>
        </div>
      </div>

      <div className="sticky bottom-0 p-4 bg-background border-t border-border">
        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-2">
            <Button variant="outline" size="sm" type="button">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" type="button">
              <Tag className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder={
                  isComposing ? "Enterで確定、もう一度Enterで送信..." : "課題について詳しく教えてください..."
                }
                className="min-h-[6rem] max-h-[12rem] resize-y text-lg leading-7"
                autoFocus
                disabled={isLoading || isRunning}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleAIExecution}
              disabled={isLoading || isRunning || !input.trim()}
            >
              <Zap className="w-4 h-4 mr-1" />
              {isRunning ? "実行中..." : "AI実行(解析→設計→出力)"}
            </Button>
            <Button type="submit" size="sm" disabled={isLoading || isRunning || isComposing}>
              <Send className="w-4 h-4 mr-1" />
              {isComposing ? "確定" : "送信"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
