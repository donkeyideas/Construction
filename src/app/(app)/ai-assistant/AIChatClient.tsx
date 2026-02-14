"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  Send,
  ChevronRight,
  Plus,
  X,
  BarChart3,
  FileText,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface RelatedDataItem {
  title: string;
  value: string;
  detail?: string;
}

interface AIChatClientProps {
  companyId: string;
  userId: string;
  userName: string;
  userInitials: string;
  hasProvider: boolean;
  providerName: string | null;
  initialConversations: Conversation[];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AIChatClient({
  companyId,
  userName,
  userInitials,
  hasProvider,
  providerName,
  initialConversations,
}: AIChatClientProps) {
  const [input, setInput] = useState("");
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [relatedData, setRelatedData] = useState<RelatedDataItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);

  const { messages, setMessages, sendMessage, status, error } = useChat({
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

  // Extract related data from tool results in messages
  useEffect(() => {
    const items: RelatedDataItem[] = [];
    for (const msg of messages) {
      if (msg.role !== "assistant" || !msg.parts) continue;
      for (const part of msg.parts) {
        if (
          part.type === "tool-invocation" &&
          (part as ToolPart).state === "output-available"
        ) {
          const tp = part as ToolPart;
          const output = tp.output;
          if (tp.toolInvocation?.toolName === "queryProjects" && Array.isArray(output)) {
            const overBudget = output.filter(
              (p: Record<string, unknown>) =>
                Number(p.actual_cost ?? 0) > Number(p.contract_amount ?? 0)
            );
            if (overBudget.length > 0) {
              items.push({
                title: "Over-Budget Projects",
                value: String(overBudget.length),
                detail: overBudget
                  .map((p: Record<string, unknown>) => p.name)
                  .join(", "),
              });
            }
            if (output.length > 0) {
              items.push({
                title: "Projects Queried",
                value: String(output.length),
                detail: `Filtered from company data`,
              });
            }
          }
          if (tp.toolInvocation?.toolName === "queryFinancials" && output) {
            const o = output as Record<string, unknown>;
            if (o.totalAmount !== undefined) {
              items.push({
                title: "Total Invoiced",
                value: formatCurrency(Number(o.totalAmount)),
                detail: `${o.overdueCount ?? 0} overdue, ${o.paidCount ?? 0} paid`,
              });
            }
            if (o.totalOutstanding !== undefined) {
              items.push({
                title: "Outstanding Balance",
                value: formatCurrency(Number(o.totalOutstanding)),
              });
            }
            if (Array.isArray(o)) {
              items.push({
                title: "Financial Records",
                value: String(o.length),
              });
            }
          }
          if (
            tp.toolInvocation?.toolName === "queryProperties" &&
            Array.isArray(output) &&
            output.length > 0
          ) {
            const totalUnits = output.reduce(
              (s: number, p: Record<string, unknown>) =>
                s + Number(p.total_units ?? 0),
              0
            );
            const occupied = output.reduce(
              (s: number, p: Record<string, unknown>) =>
                s + Number(p.occupied_units ?? 0),
              0
            );
            items.push({
              title: "Properties",
              value: String(output.length),
              detail:
                totalUnits > 0
                  ? `${occupied}/${totalUnits} units occupied`
                  : undefined,
            });
          }
          if (
            tp.toolInvocation?.toolName === "queryMaintenanceRequests" &&
            Array.isArray(output)
          ) {
            items.push({
              title: "Open Requests",
              value: String(output.length),
              detail: `Active maintenance items`,
            });
          }
        }
      }
    }
    setRelatedData(items);
  }, [messages]);

  // Save conversation when assistant finishes responding
  useEffect(() => {
    if (status !== "ready" || messages.length < 2 || savingRef.current) return;
    savingRef.current = true;

    const serializable = messages.map((m) => {
      // Extract text content from parts
      const textContent = m.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") ?? "";
      return {
        id: m.id,
        role: m.role,
        content: textContent,
      };
    });

    const firstUserMsg = serializable.find((m) => m.role === "user");
    const title = firstUserMsg?.content
      ? firstUserMsg.content.slice(0, 80)
      : "Chat";

    if (activeConversationId) {
      // Update existing
      fetch(`/api/ai/conversations/${activeConversationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: serializable, title }),
      })
        .then(() => refreshConversations())
        .finally(() => {
          savingRef.current = false;
        });
    } else {
      // Create new
      fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, messages: serializable }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.id) setActiveConversationId(data.id);
          return refreshConversations();
        })
        .finally(() => {
          savingRef.current = false;
        });
    }
  }, [status, messages, activeConversationId]);

  const refreshConversations = async () => {
    const res = await fetch("/api/ai/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
    }
  };

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

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setRelatedData([]);
    setInput("");
  }, [setMessages]);

  const handleLoadConversation = useCallback(
    async (id: string) => {
      if (id === activeConversationId) return;
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveConversationId(id);
      // Load stored messages back into chat
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(
          data.messages.map(
            (m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              parts: [{ type: "text", text: m.content }],
            })
          )
        );
      } else {
        setMessages([]);
      }
      setRelatedData([]);
    },
    [activeConversationId, setMessages]
  );

  const handleDeleteConversation = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      if (id === activeConversationId) {
        handleNewChat();
      }
      refreshConversations();
    },
    [activeConversationId, handleNewChat]
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
        <a href="/admin/ai-providers">Configure AI Providers</a>
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
        {/* Header with tabs */}
        <div className="ai-chat-header">
          <div className="ai-chat-header-top">
            <h2>AI Assistant</h2>
            {providerName && (
              <span className="ai-chat-provider-badge">
                <span className="ai-chat-provider-dot" />
                {providerName}
              </span>
            )}
          </div>
          <div className="ai-chat-tabs">
            <button className="ai-chat-tab active">Chat</button>
            <a href="/automation" className="ai-chat-tab">
              Automation Center
            </a>
          </div>
        </div>

        {/* Messages */}
        <div className="ai-messages">
          {messages.length === 0 && <WelcomeMessage userName={userName} />}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              userInitials={userInitials}
              userName={userName}
            />
          ))}

          {isLoading && messages.length > 0 && <TypingIndicator />}

          {error && (
            <div className="ai-error">
              {error.message || "Something went wrong. Please try again."}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts (pills) */}
        {messages.length === 0 && (
          <div className="ai-suggested-prompts">
            {[
              "Over-budget projects",
              "Overdue invoices",
              "Cash flow summary",
              "Open maintenance",
              "Property portfolio",
            ].map((text) => (
              <button
                key={text}
                className="ai-suggested-pill"
                onClick={() => handleQuickPrompt(text)}
                disabled={isLoading}
              >
                {text}
              </button>
            ))}
          </div>
        )}

        {/* Input form */}
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

      {/* Right Sidebar */}
      <aside className="ai-right-sidebar">
        {/* Related Data */}
        <div className="ai-sidebar-section">
          <h4>Related Data</h4>
          {relatedData.length > 0 ? (
            <div className="ai-data-cards">
              {relatedData.map((item, i) => (
                <div key={i} className="ai-data-card">
                  <div className="ai-data-card-title">{item.title}</div>
                  <div className="ai-data-card-value">{item.value}</div>
                  {item.detail && (
                    <div className="ai-data-card-detail">{item.detail}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="ai-data-empty">
              Ask a question to see related data here
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="ai-sidebar-section">
          <h4>Quick Actions</h4>
          <div className="ai-quick-actions-grid">
            <button
              className="ai-quick-action-btn"
              disabled={isLoading}
              onClick={() =>
                handleQuickPrompt("Analyze all active projects and flag any risks")
              }
            >
              <BarChart3 size={18} />
              Analyze
            </button>
            <button
              className="ai-quick-action-btn"
              disabled={isLoading}
              onClick={() =>
                handleQuickPrompt("Generate a financial summary report")
              }
            >
              <FileText size={18} />
              Report
            </button>
            <button
              className="ai-quick-action-btn"
              disabled={isLoading}
              onClick={() =>
                handleQuickPrompt("Forecast cash flow for the next 90 days")
              }
            >
              <TrendingUp size={18} />
              Forecast
            </button>
            <button
              className="ai-quick-action-btn"
              disabled={isLoading}
              onClick={() =>
                handleQuickPrompt(
                  "Identify top risk areas across all projects and properties"
                )
              }
            >
              <ShieldAlert size={18} />
              Risk
            </button>
          </div>
        </div>

        {/* Previous Conversations */}
        <div className="ai-sidebar-section">
          <h4>Previous Conversations</h4>
          <button className="ai-new-chat-btn" onClick={handleNewChat}>
            <Plus size={14} />
            New Chat
          </button>
          {conversations.length > 0 ? (
            <div className="ai-conversation-list">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`ai-conversation-item ${
                    conv.id === activeConversationId ? "active" : ""
                  }`}
                  onClick={() => handleLoadConversation(conv.id)}
                >
                  <span className="ai-conversation-title">
                    {conv.title || "Untitled"}
                  </span>
                  <span className="ai-conversation-date">
                    {formatDate(conv.updated_at)}
                  </span>
                  <span
                    className="ai-conversation-delete"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                  >
                    <X size={12} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="ai-no-conversations">No conversations yet</div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper types for tool parts in AI SDK v6
// ---------------------------------------------------------------------------

interface ToolPart {
  type: string;
  state: string;
  toolInvocation?: { toolName: string };
  input?: unknown;
  output?: unknown;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WelcomeMessage({ userName }: { userName: string }) {
  return (
    <div className="ai-welcome">
      <div className="ai-welcome-icon">
        <Sparkles size={24} />
      </div>
      <h3>Welcome, {userName}</h3>
      <p>
        Ask me anything about your projects, financials, properties, or
        operations. I can query your real data to provide accurate answers.
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChatMessage({
  message,
  userInitials,
  userName,
}: {
  message: any;
  userInitials: string;
  userName: string;
}) {
  const isUser = message.role === "user";
  const time = message.metadata?.createdAt
    ? formatTime(new Date(message.metadata.createdAt as string))
    : "";

  return (
    <div
      className={`ai-msg-row ${
        isUser ? "ai-msg-row-user" : "ai-msg-row-assistant"
      }`}
    >
      {/* Avatar */}
      <div
        className={`ai-msg-avatar ${
          isUser ? "ai-avatar-user" : "ai-avatar-bot"
        }`}
      >
        {isUser ? userInitials : <Sparkles size={14} />}
      </div>

      {/* Bubble */}
      <div className="ai-msg-bubble">
        <div className="ai-msg-meta">
          <span className="ai-msg-sender">
            {isUser ? userName : "Assistant"}
          </span>
          {time && <span className="ai-msg-time">{time}</span>}
        </div>

        <div
          className={`ai-msg-content ${
            isUser ? "ai-msg-content-user" : "ai-msg-content-assistant"
          }`}
        >
          {message.parts?.map(
            (
              part: {
                type: string;
                text?: string;
                state?: string;
                toolInvocation?: { toolName: string };
                input?: unknown;
                output?: unknown;
              },
              idx: number
            ) => {
              if (part.type === "text" && part.text) {
                return isUser ? (
                  <span key={idx}>{part.text}</span>
                ) : (
                  <ReactMarkdown key={idx}>{part.text}</ReactMarkdown>
                );
              }

              // Tool invocation parts — AI SDK v6 puts state/input/output
              // directly on the part, NOT nested under part.toolInvocation
              if (part.type === "tool-invocation") {
                const toolName = part.toolInvocation?.toolName ?? "unknown";
                const state = part.state ?? "input-available";
                const partInput = part.input;
                const partOutput = part.output;

                return (
                  <ToolCallDisplay
                    key={idx}
                    toolName={toolName}
                    state={state}
                    input={partInput}
                    output={partOutput}
                  />
                );
              }

              return null;
            }
          )}

          {/* Fallback: if no parts, render content directly */}
          {(!message.parts || message.parts.length === 0) &&
            message.content && (
              <>
                {isUser ? (
                  <span>{String(message.content)}</span>
                ) : (
                  <ReactMarkdown>{String(message.content)}</ReactMarkdown>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
