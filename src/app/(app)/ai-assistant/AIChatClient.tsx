"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Sparkles, Send, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIChatClientProps {
  companyId: string;
  userId: string;
  userName: string;
  hasProvider: boolean;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AIChatClient({
  companyId,
  userId,
  userName,
  hasProvider,
}: AIChatClientProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: { companyId },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;
      sendMessage({ text: trimmed });
      setInput("");
    },
    [input, isLoading, sendMessage]
  );

  const handleQuickPrompt = useCallback(
    (text: string) => {
      if (isLoading) return;
      sendMessage({ text });
    },
    [isLoading, sendMessage]
  );

  // -------------------------------------------------------------------------
  // No provider configured
  // -------------------------------------------------------------------------

  if (!hasProvider) {
    return (
      <div className="ai-no-provider">
        <Sparkles size={48} style={{ color: "var(--color-amber)" }} />
        <h3>AI Assistant Not Configured</h3>
        <p>
          An administrator needs to configure an AI provider before the
          assistant can be used.
        </p>
        <a href="/admin/settings">Configure AI Providers</a>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Chat interface
  // -------------------------------------------------------------------------

  return (
    <div className="ai-chat-layout">
      {/* Main chat area */}
      <div className="ai-chat-main">
        <div className="ai-chat-header">
          <h2>AI Assistant</h2>
          <p>
            Ask about projects, financials, properties, or get recommendations.
          </p>
        </div>

        <div className="ai-messages">
          {messages.length === 0 && <WelcomeMessage userName={userName} />}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isLoading && messages.length > 0 && (
            <TypingIndicator />
          )}

          {error && (
            <div className="ai-error">
              Something went wrong. Please try again.
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="ai-input-form">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your projects, finances, or properties..."
            className="ai-input"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="ai-send-btn"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Context sidebar */}
      <aside className="ai-context-panel">
        <div className="ai-context-section">
          <h4>Quick Prompts</h4>
          <QuickPrompt
            text="Which projects are currently over budget?"
            onClick={handleQuickPrompt}
            disabled={isLoading}
          />
          <QuickPrompt
            text="Show me overdue invoices"
            onClick={handleQuickPrompt}
            disabled={isLoading}
          />
          <QuickPrompt
            text="What certifications expire this month?"
            onClick={handleQuickPrompt}
            disabled={isLoading}
          />
          <QuickPrompt
            text="Summarize my cash flow position"
            onClick={handleQuickPrompt}
            disabled={isLoading}
          />
          <QuickPrompt
            text="Which properties have open maintenance requests?"
            onClick={handleQuickPrompt}
            disabled={isLoading}
          />
        </div>

        <div className="ai-context-section">
          <h4>Capabilities</h4>
          <ul className="ai-capabilities">
            <li>Query project status and budgets</li>
            <li>Search financial records</li>
            <li>Find overdue items and alerts</li>
            <li>Analyze property portfolios</li>
            <li>Review document metadata</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WelcomeMessage({ userName }: { userName: string }) {
  return (
    <div className="ai-welcome">
      <h3>Welcome, {userName}</h3>
      <p>
        Ask me anything about your projects, financials, properties, or
        operations. I can query your real data to provide accurate answers.
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChatMessage({ message }: { message: any }) {
  const isUser = message.role === "user";

  return (
    <div className={`ai-msg ${isUser ? "ai-msg-user" : "ai-msg-assistant"}`}>
      <div className="ai-msg-role">{isUser ? "You" : "Assistant"}</div>
      {message.parts?.map((part: { type: string; text?: string; toolInvocation?: { toolName: string; state: string; input?: unknown; output?: unknown } }, idx: number) => {
        if (part.type === "text" && part.text) {
          return <MessageText key={idx} text={part.text} />;
        }

        // Tool invocation parts have type like "tool-queryProjects"
        if (part.type.startsWith("tool-")) {
          return (
            <ToolCallDisplay
              key={idx}
              toolName={part.type.replace("tool-", "")}
              state={
                part.toolInvocation?.state ?? "input-available"
              }
              input={part.toolInvocation?.input}
              output={part.toolInvocation?.output}
            />
          );
        }

        return null;
      })}

      {/* Fallback: if no parts, render content directly */}
      {(!message.parts || message.parts.length === 0) && message.content && (
        <MessageText text={String(message.content)} />
      )}
    </div>
  );
}

function MessageText({ text }: { text: string }) {
  return <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>;
}

function ToolCallDisplay({
  toolName,
  state,
  input,
  output,
}: {
  toolName: string;
  state: string;
  input?: unknown;
  output?: unknown;
}) {
  const [expanded, setExpanded] = useState(false);

  const friendlyName: Record<string, string> = {
    queryProjects: "Querying projects",
    queryFinancials: "Querying financial data",
    queryProperties: "Querying properties",
    queryMaintenanceRequests: "Querying maintenance requests",
  };

  const label = friendlyName[toolName] ?? `Running ${toolName}`;
  const isDone = state === "output-available";
  const isError = state === "output-error";
  const isPending = !isDone && !isError;

  return (
    <div className="ai-tool-call">
      <div
        className="ai-tool-call-header"
        data-expanded={expanded ? "true" : "false"}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight size={12} />
        <span>{label}</span>
        <span
          className={`ai-tool-status ${
            isDone
              ? "ai-tool-status-done"
              : isError
                ? "ai-tool-status-error"
                : "ai-tool-status-pending"
          }`}
        >
          {isDone ? "Done" : isError ? "Error" : "Running"}
        </span>
      </div>
      {expanded && (
        <div className="ai-tool-call-body">
          {input != null && (
            <>
              <strong>Parameters:</strong>
              {"\n"}
              {JSON.stringify(input as Record<string, unknown>, null, 2)}
              {"\n\n"}
            </>
          )}
          {(isDone || isError) && output != null && (
            <>
              <strong>Result:</strong>
              {"\n"}
              {typeof output === "string"
                ? output
                : JSON.stringify(output as Record<string, unknown>, null, 2)}
            </>
          )}
          {isPending && "Waiting for result..."}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="ai-typing">
      <div className="ai-typing-dot" />
      <div className="ai-typing-dot" />
      <div className="ai-typing-dot" />
    </div>
  );
}

function QuickPrompt({
  text,
  onClick,
  disabled,
}: {
  text: string;
  onClick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <button
      className="ai-quick-prompt"
      onClick={() => onClick(text)}
      disabled={disabled}
    >
      {text}
    </button>
  );
}
