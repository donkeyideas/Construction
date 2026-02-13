// ---------------------------------------------------------------------------
// Automation Rule Templates
// ---------------------------------------------------------------------------

export interface AutomationTemplate {
  name: string;
  description: string;
  trigger_type: string;
  trigger_entity: string;
  trigger_config?: Record<string, unknown>;
  conditions: { field: string; operator: string; value: string | string[] }[];
  actions: { type: string; config: Record<string, unknown> }[];
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    name: "Auto-assign urgent tickets",
    description: "Assign urgent tickets to a team member",
    trigger_type: "entity_created",
    trigger_entity: "ticket",
    conditions: [
      { field: "priority", operator: "equals", value: "urgent" },
    ],
    actions: [
      { type: "assign_to", config: {} },
    ],
  },
  {
    name: "Notify on overdue invoices",
    description: "Send notification when invoice is overdue",
    trigger_type: "status_changed",
    trigger_entity: "invoice",
    trigger_config: { to_status: "overdue" },
    conditions: [],
    actions: [
      { type: "send_notification", config: { message: "Invoice is overdue" } },
    ],
  },
  {
    name: "Ticket for expired contracts",
    description: "Create ticket when contract expires",
    trigger_type: "status_changed",
    trigger_entity: "contract",
    trigger_config: { to_status: "expired" },
    conditions: [],
    actions: [
      {
        type: "create_ticket",
        config: { title: "Follow up on expired contract", priority: "high" },
      },
    ],
  },
  {
    name: "Escalate maintenance",
    description: "Escalate unresolved maintenance after 48h",
    trigger_type: "schedule",
    trigger_entity: "maintenance_request",
    conditions: [
      { field: "status", operator: "in", value: ["submitted", "assigned"] },
    ],
    actions: [
      { type: "change_status", config: { status: "escalated" } },
    ],
  },
];

export const TRIGGER_TYPES = [
  { value: "entity_created", label: "Entity Created" },
  { value: "status_changed", label: "Status Changed" },
  { value: "field_updated", label: "Field Updated" },
  { value: "schedule", label: "Scheduled" },
];

export const TRIGGER_ENTITIES = [
  { value: "ticket", label: "Ticket" },
  { value: "invoice", label: "Invoice" },
  { value: "contract", label: "Contract" },
  { value: "project", label: "Project" },
  { value: "maintenance_request", label: "Maintenance Request" },
  { value: "rfi", label: "RFI" },
  { value: "change_order", label: "Change Order" },
];

export const ACTION_TYPES = [
  { value: "assign_to", label: "Assign To" },
  { value: "send_notification", label: "Send Notification" },
  { value: "create_ticket", label: "Create Ticket" },
  { value: "change_status", label: "Change Status" },
  { value: "send_email", label: "Send Email" },
  { value: "webhook", label: "Trigger Webhook" },
];

export const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "in", label: "In" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
];
