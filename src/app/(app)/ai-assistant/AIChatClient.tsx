"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  HardHat,
  Building2,
  DollarSign,
  Wrench,
  Users,
  ClipboardList,
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
  type?: "positive" | "negative" | "warning" | "neutral";
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

// Contextual follow-up suggestions based on what tools were called
const FOLLOW_UP_MAP: Record<string, string[]> = {
  queryProjects: [
    "Which projects are over budget?",
    "Show schedule status for active projects",
    "Compare project completion rates",
  ],
  queryFinancials: [
    "Show overdue invoices",
    "What's our AR vs AP position?",
    "Recent payment activity",
  ],
  queryProperties: [
    "Which properties have low occupancy?",
    "What's the total monthly NOI?",
    "Show leases expiring in 90 days",
  ],
  queryMaintenanceRequests: [
    "Show emergency maintenance requests",
    "Maintenance by property",
    "How many requests are overdue?",
  ],
  querySafetyData: [
    "Show OSHA recordable incidents",
    "Recent toolbox talks",
    "Safety trends this quarter",
  ],
  queryLeases: [
    "Leases expiring in 30 days",
    "Total monthly rent roll",
    "Show auto-renew leases",
  ],
  queryEquipment: [
    "Equipment needing maintenance",
    "What equipment is available?",
    "Total equipment asset value",
  ],
  queryWorkforce: [
    "Show team by role",
    "Expiring certifications",
    "Who joined recently?",
  ],
};

// ---------------------------------------------------------------------------
// Markdown config – wrap tables in scrollable container
// ---------------------------------------------------------------------------

const markdownComponents = {
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<"table">) => (
    <div className="table-wrap">
      <table {...props}>{children}</table>
    </div>
  ),
};

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
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
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

  // Extract related data and follow-up suggestions from tool results
  useEffect(() => {
    const items: RelatedDataItem[] = [];
    const toolsUsed = new Set<string>();

    for (const msg of messages) {
      if (msg.role !== "assistant" || !msg.parts) continue;
      for (const part of msg.parts) {
        if (
          part.type === "tool-invocation" &&
          (part as ToolPart).state === "output-available"
        ) {
          const tp = part as ToolPart;
          const output = tp.output as Record<string, unknown> | unknown[];
          const toolName = tp.toolInvocation?.toolName ?? "";
          toolsUsed.add(toolName);

          if (!output || typeof output !== "object") continue;

          // Extract summary data from structured tool responses
          const summary = (output as Record<string, unknown>)
            .summary as Record<string, unknown> | undefined;

          if (toolName === "queryProjects" && summary) {
            items.push({
              title: "Projects Found",
              value: String(summary.count ?? 0),
              detail: `Avg ${summary.averageCompletion ?? 0}% complete`,
            });
            if (Number(summary.overBudgetCount ?? 0) > 0) {
              items.push({
                title: "Over Budget",
                value: String(summary.overBudgetCount),
                detail: `${formatCurrency(Number(summary.totalVariance ?? 0))} total variance`,
                type: "negative",
              });
            }
            if (Number(summary.totalContractValue ?? 0) > 0) {
              items.push({
                title: "Total Contract Value",
                value: formatCurrency(Number(summary.totalContractValue)),
              });
            }
          }

          if (toolName === "queryFinancials" && summary) {
            if (summary.totalOutstanding !== undefined) {
              items.push({
                title: "Outstanding Balance",
                value: formatCurrency(Number(summary.totalOutstanding)),
                type:
                  Number(summary.overdueCount ?? 0) > 0
                    ? "warning"
                    : "neutral",
              });
            }
            if (summary.accountsReceivable !== undefined) {
              items.push({
                title: "Accounts Receivable",
                value: formatCurrency(Number(summary.accountsReceivable)),
              });
            }
            if (summary.accountsPayable !== undefined) {
              items.push({
                title: "Accounts Payable",
                value: formatCurrency(Number(summary.accountsPayable)),
              });
            }
            if (summary.totalOverdueAmount !== undefined) {
              items.push({
                title: "Overdue Amount",
                value: formatCurrency(Number(summary.totalOverdueAmount)),
                detail: `${summary.count ?? 0} overdue invoices`,
                type: "negative",
              });
            }
          }

          if (toolName === "queryProperties" && summary) {
            if (Number(summary.count ?? 0) > 0) {
              items.push({
                title: "Portfolio",
                value: `${summary.count} properties`,
                detail: `${summary.avgOccupancy ?? 0}% occupancy`,
                type:
                  Number(summary.avgOccupancy ?? 0) >= 90
                    ? "positive"
                    : Number(summary.avgOccupancy ?? 0) >= 75
                      ? "warning"
                      : "negative",
              });
            }
            if (Number(summary.totalMonthlyNOI ?? 0) !== 0) {
              items.push({
                title: "Monthly NOI",
                value: formatCurrency(Number(summary.totalMonthlyNOI)),
                type:
                  Number(summary.totalMonthlyNOI ?? 0) > 0
                    ? "positive"
                    : "negative",
              });
            }
          }

          if (toolName === "queryMaintenanceRequests" && summary) {
            items.push({
              title: "Open Requests",
              value: String(summary.total ?? 0),
              detail:
                Number(summary.urgentCount ?? 0) > 0
                  ? `${summary.urgentCount} urgent`
                  : "No urgent items",
              type:
                Number(summary.urgentCount ?? 0) > 0
                  ? "negative"
                  : "positive",
            });
          }

          if (toolName === "querySafetyData" && summary) {
            items.push({
              title: "Safety Incidents",
              value: String(summary.totalIncidents ?? 0),
              detail: `${summary.openIncidents ?? 0} open, ${summary.oshaRecordable ?? 0} OSHA recordable`,
              type:
                Number(summary.openIncidents ?? 0) > 0
                  ? "warning"
                  : "positive",
            });
          }

          if (toolName === "queryLeases" && summary) {
            items.push({
              title: "Leases",
              value: String(summary.count ?? 0),
              detail: `${formatCurrency(Number(summary.totalMonthlyRent ?? 0))}/mo rent`,
            });
          }

          if (toolName === "queryEquipment" && summary) {
            items.push({
              title: "Equipment",
              value: String(summary.count ?? 0),
              detail: `${summary.available ?? 0} available, ${summary.inUse ?? 0} in use`,
              type:
                Number(summary.maintenanceOverdue ?? 0) > 0
                  ? "warning"
                  : "neutral",
            });
          }

          if (toolName === "queryWorkforce" && summary) {
            items.push({
              title: "Team Members",
              value: String(summary.activeMembers ?? 0),
              detail: `${summary.inactiveMembers ?? 0} inactive`,
            });
          }
        }
      }
    }

    setRelatedData(items);

    // Build contextual follow-up suggestions from tools used
    const suggestions: string[] = [];
    for (const tool of toolsUsed) {
      const mapped = FOLLOW_UP_MAP[tool];
      if (mapped) {
        for (const s of mapped) {
          if (suggestions.length < 4 && !suggestions.includes(s)) {
            suggestions.push(s);
          }
        }
      }
    }
    setFollowUpSuggestions(suggestions);
  }, [messages]);

  // Save conversation when assistant finishes responding
  useEffect(() => {
    if (status !== "ready" || messages.length < 2 || savingRef.current) return;
    savingRef.current = true;

    const serializable = messages.map((m) => {
      const textContent =
        m.parts
          ?.filter(
            (p): p is { type: "text"; text: string } => p.type === "text"
          )
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
    setFollowUpSuggestions([]);
    setInput("");
  }, [setMessages]);

  const handleLoadConversation = useCallback(
    async (id: string) => {
      if (id === activeConversationId) return;
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveConversationId(id);
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
      setFollowUpSuggestions([]);
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
        {/* Header */}
        <div className="ai-chat-header">
          <div className="ai-chat-header-top">
            <div className="ai-chat-header-left">
              <div className="ai-chat-header-icon">
                <Sparkles size={20} />
              </div>
              <div>
                <h2>AI Assistant</h2>
                <p className="ai-chat-header-sub">
                  Ask questions about your projects, finances, properties, and
                  operations
                </p>
              </div>
            </div>
            {providerName && (
              <span className="ai-chat-provider-badge">
                <span className="ai-chat-provider-dot" />
                {providerName}
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="ai-messages">
          {messages.length === 0 && (
            <WelcomeMessage
              userName={userName}
              onPrompt={handleQuickPrompt}
              disabled={isLoading}
            />
          )}

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

        {/* Contextual follow-up suggestions */}
        {followUpSuggestions.length > 0 && !isLoading && messages.length > 0 && (
          <div className="ai-suggested-prompts">
            {followUpSuggestions.map((text) => (
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
                <div
                  key={i}
                  className={`ai-data-card ${item.type ? `ai-data-card-${item.type}` : ""}`}
                >
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
                handleQuickPrompt(
                  "Give me a complete overview of all active projects with budget and schedule status"
                )
              }
            >
              <BarChart3 size={18} />
              Analyze
            </button>
            <button
              className="ai-quick-action-btn"
              disabled={isLoading}
              onClick={() =>
                handleQuickPrompt(
                  "Generate a financial summary with AR/AP, outstanding invoices, and cash position"
                )
              }
            >
              <FileText size={18} />
              Report
            </button>
            <button
              className="ai-quick-action-btn"
              disabled={isLoading}
              onClick={() =>
                handleQuickPrompt(
                  "What are the top risks across all projects, properties, and financials right now?"
                )
              }
            >
              <ShieldAlert size={18} />
              Risks
            </button>
            <button
              className="ai-quick-action-btn"
              disabled={isLoading}
              onClick={() =>
                handleQuickPrompt(
                  "Show property portfolio performance with occupancy, NOI, and any leases expiring soon"
                )
              }
            >
              <TrendingUp size={18} />
              Portfolio
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
                  <span className="ai-conversation-date" suppressHydrationWarning>
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

function WelcomeMessage({
  userName,
  onPrompt,
  disabled,
}: {
  userName: string;
  onPrompt: (text: string) => void;
  disabled: boolean;
}) {
  const starters = [
    {
      icon: <HardHat size={18} />,
      label: "Project Status",
      prompt: "Show me all active projects with budget and schedule status",
    },
    {
      icon: <DollarSign size={18} />,
      label: "Financial Overview",
      prompt:
        "Give me a financial summary including AR/AP, overdue invoices, and cash position",
    },
    {
      icon: <Building2 size={18} />,
      label: "Property Portfolio",
      prompt:
        "Show the property portfolio with occupancy rates, revenue, and NOI",
    },
    {
      icon: <Wrench size={18} />,
      label: "Maintenance",
      prompt: "What are the open maintenance requests by priority?",
    },
    {
      icon: <ShieldAlert size={18} />,
      label: "Safety Report",
      prompt:
        "Give me a safety overview including recent incidents and toolbox talks",
    },
    {
      icon: <Users size={18} />,
      label: "Team Overview",
      prompt:
        "Show team composition by role and any expiring certifications",
    },
    {
      icon: <ClipboardList size={18} />,
      label: "Lease Expiration",
      prompt: "Show leases expiring in the next 90 days",
    },
    {
      icon: <TrendingUp size={18} />,
      label: "Risk Analysis",
      prompt:
        "Identify the top risks across projects, financials, and properties",
    },
  ];

  return (
    <div className="ai-welcome">
      <div className="ai-welcome-icon">
        <Sparkles size={28} />
      </div>
      <h3>Welcome, {userName}</h3>
      <p>
        I have access to your project, financial, property, safety, equipment,
        and workforce data. Ask me anything — I&apos;ll query your real data
        and give you actionable insights.
      </p>
      <div className="ai-welcome-starters">
        {starters.map((s) => (
          <button
            key={s.label}
            className="ai-welcome-starter"
            onClick={() => onPrompt(s.prompt)}
            disabled={disabled}
          >
            <span className="ai-welcome-starter-icon">{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
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
          {time && <span className="ai-msg-time" suppressHydrationWarning>{time}</span>}
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
                  <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]} components={markdownComponents}>{part.text}</ReactMarkdown>
                );
              }

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
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{String(message.content)}</ReactMarkdown>
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
    querySafetyData: "Querying safety data",
    queryLeases: "Querying leases",
    queryEquipment: "Querying equipment",
    queryWorkforce: "Querying workforce data",
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
