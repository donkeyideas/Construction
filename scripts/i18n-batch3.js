const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '..');

function applyReplacements(relPath, changes) {
  const filePath = path.join(BASE, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  let applied = 0;
  for (const { from, to } of changes) {
    if (!content.includes(from)) {
      console.warn(`  SKIP in ${path.basename(relPath)}: "${from.substring(0, 60)}..."`);
      continue;
    }
    content = content.replace(from, to);
    applied++;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${relPath} (${applied}/${changes.length})`);
}

// ============================================================================
// Super Admin: InboxClient.tsx
// ============================================================================
applyReplacements('src/app/super-admin/inbox/InboxClient.tsx', [
  { from: 'import { useState, useEffect, useCallback } from "react";\nimport { useRouter } from "next/navigation";', to: 'import { useState, useEffect, useCallback } from "react";\nimport { useRouter } from "next/navigation";\nimport { useTranslations } from "next-intl";' },
  { from: 'export default function InboxClient({ submissions: initialSubmissions, stats }: Props) {', to: 'export default function InboxClient({ submissions: initialSubmissions, stats }: Props) {\n  const t = useTranslations("superAdmin");' },
  { from: '<h2>Inbox</h2>', to: '<h2>{t("inbox.title")}</h2>' },
  { from: '<p className="admin-header-sub">\n            Contact form submissions and custom plan requests', to: '<p className="admin-header-sub">\n            {t("inbox.subtitle")}' },
  { from: '"admin-stat-label">Total Submissions</div>', to: '"admin-stat-label">{t("inbox.totalSubmissions")}</div>' },
  { from: '"admin-stat-label">New</div>', to: '"admin-stat-label">{t("inbox.new")}</div>' },
  { from: '"admin-stat-label">Read</div>', to: '"admin-stat-label">{t("inbox.read")}</div>' },
  { from: '"admin-stat-label">Archived</div>', to: '"admin-stat-label">{t("inbox.archived")}</div>' },
]);

// ============================================================================
// Super Admin: SupportTicketsClient.tsx
// ============================================================================
applyReplacements('src/app/super-admin/support-tickets/SupportTicketsClient.tsx', [
  { from: 'import { useState, useEffect, useCallback } from "react";\nimport { useRouter } from "next/navigation";', to: 'import { useState, useEffect, useCallback } from "react";\nimport { useRouter } from "next/navigation";\nimport { useTranslations } from "next-intl";' },
  { from: 'export default function SupportTicketsClient({ tickets: initialTickets, stats }: Props) {', to: 'export default function SupportTicketsClient({ tickets: initialTickets, stats }: Props) {\n  const t = useTranslations("superAdmin");' },
  { from: '<h2>Support Tickets</h2>', to: '<h2>{t("supportTickets.title")}</h2>' },
  { from: '<p className="admin-header-sub">\n            Manage and respond to customer support requests', to: '<p className="admin-header-sub">\n            {t("supportTickets.subtitle")}' },
  { from: '"admin-stat-label">Total Tickets</div>', to: '"admin-stat-label">{t("supportTickets.totalTickets")}</div>' },
  { from: '"admin-stat-label">Open</div>', to: '"admin-stat-label">{t("supportTickets.open")}</div>' },
  { from: '"admin-stat-label">In Progress</div>', to: '"admin-stat-label">{t("supportTickets.inProgress")}</div>' },
  { from: '"admin-stat-label">Avg Resolution</div>', to: '"admin-stat-label">{t("supportTickets.avgResolution")}</div>' },
]);

// ============================================================================
// Super Admin: SystemHealthClient.tsx
// ============================================================================
applyReplacements('src/app/super-admin/system-health/SystemHealthClient.tsx', [
  { from: 'import { useRouter } from "next/navigation";', to: 'import { useRouter } from "next/navigation";\nimport { useTranslations } from "next-intl";' },
  { from: 'export default function SystemHealthClient({ data }: Props) {', to: 'export default function SystemHealthClient({ data }: Props) {\n  const t = useTranslations("superAdmin");' },
  { from: '<h2>System Health</h2>', to: '<h2>{t("systemHealth.title")}</h2>' },
  { from: 'Platform infrastructure overview and database statistics', to: '{t("systemHealth.subtitle")}' },
  { from: '>Refresh</button>', to: '>{t("systemHealth.refresh")}</button>' },
  { from: '"admin-stat-label">Total Users</div>', to: '"admin-stat-label">{t("systemHealth.totalUsers")}</div>' },
  { from: '"admin-stat-label">Total Companies</div>', to: '"admin-stat-label">{t("systemHealth.totalCompanies")}</div>' },
  { from: '"admin-stat-label">Total Records</div>', to: '"admin-stat-label">{t("systemHealth.totalRecords")}</div>' },
  { from: '"admin-stat-label">System Status</div>', to: '"admin-stat-label">{t("systemHealth.systemStatus")}</div>' },
]);

// ============================================================================
// Super Admin: EmailTemplatesClient.tsx
// ============================================================================
applyReplacements('src/app/super-admin/email-templates/EmailTemplatesClient.tsx', [
  { from: 'import { useState } from "react";', to: 'import { useState } from "react";\nimport { useTranslations } from "next-intl";' },
  { from: 'const [templates, setTemplates] = useState(initialTemplates);', to: 'const t = useTranslations("superAdmin");\n  const [templates, setTemplates] = useState(initialTemplates);' },
  { from: '<h2>Email Templates</h2>', to: '<h2>{t("emailTemplates.title")}</h2>' },
  { from: 'Manage email templates sent to users and companies', to: '{t("emailTemplates.subtitle")}' },
]);

// ============================================================================
// Admin Dashboard: AutomationClient.tsx
// ============================================================================
applyReplacements('src/app/(admin-dashboard)/admin-panel/automation/AutomationClient.tsx', [
  { from: 'import { useState } from "react";', to: 'import { useState } from "react";\nimport { useTranslations } from "next-intl";' },
  { from: 'const [rules, setRules] = useState(initialRules);', to: 'const t = useTranslations("adminPanel");\n  const [rules, setRules] = useState(initialRules);' },
  { from: '<h2>Automation</h2>', to: '<h2>{t("automation.title")}</h2>' },
  { from: 'Create rules to automate repetitive tasks and workflows', to: '{t("automation.subtitle")}' },
  { from: '>View Logs</button>', to: '>{t("automation.viewLogs")}</button>' },
  { from: '>Create Rule</button>', to: '>{t("automation.createRule")}</button>' },
]);

// ============================================================================
// Admin Dashboard: AutomationLogsClient.tsx
// ============================================================================
applyReplacements('src/app/(admin-dashboard)/admin-panel/automation/logs/AutomationLogsClient.tsx', [
  { from: 'import { useState } from "react";', to: 'import { useState } from "react";\nimport { useTranslations } from "next-intl";' },
  { from: 'export default function AutomationLogsClient({ logs: initialLogs }: Props) {', to: 'export default function AutomationLogsClient({ logs: initialLogs }: Props) {\n  const t = useTranslations("adminPanel");' },
  { from: '<h2>Automation Logs</h2>', to: '<h2>{t("automationLogs.title")}</h2>' },
  { from: 'Review execution history and debug automation rules', to: '{t("automationLogs.subtitle")}' },
  { from: '>Back to Rules</Link>', to: '>{t("automationLogs.backToRules")}</Link>' },
]);

// ============================================================================
// Admin Dashboard: IntegrationsClient.tsx
// ============================================================================
applyReplacements('src/app/(admin-dashboard)/admin-panel/company/integrations/IntegrationsClient.tsx', [
  { from: 'import { useState } from "react";', to: 'import { useState } from "react";\nimport { useTranslations } from "next-intl";' },
  { from: 'export default function IntegrationsClient({', to: 'export default function IntegrationsClient({' },
  { from: '<h2>Integrations</h2>', to: '<h2>{t("integrations.title")}</h2>' },
  { from: 'Connect third-party services to sync data and automate workflows', to: '{t("integrations.subtitle")}' },
]);

// Now add the t hook to IntegrationsClient since it has a different pattern
{
  const fp = path.join(BASE, 'src/app/(admin-dashboard)/admin-panel/company/integrations/IntegrationsClient.tsx');
  let c = fs.readFileSync(fp, 'utf8');
  // Add t after first useState in the component
  if (!c.includes('useTranslations("adminPanel")')) {
    c = c.replace(
      'const [integrations, setIntegrations] = useState(initial);',
      'const t = useTranslations("adminPanel");\n  const [integrations, setIntegrations] = useState(initial);'
    );
    fs.writeFileSync(fp, c, 'utf8');
    console.log('Added useTranslations to IntegrationsClient');
  }
}

// ============================================================================
// Admin Dashboard: SecurityClient.tsx
// ============================================================================
applyReplacements('src/app/(admin-dashboard)/admin-panel/security/SecurityClient.tsx', [
  { from: 'import { useState, useEffect } from "react";', to: 'import { useState, useEffect } from "react";\nimport { useTranslations } from "next-intl";' },
  { from: 'export default function SecurityClient() {', to: 'export default function SecurityClient() {\n  const t = useTranslations("adminPanel");' },
  { from: '<h2>Security</h2>', to: '<h2>{t("security.title")}</h2>' },
  { from: 'Manage password policies, two-factor authentication, and session settings', to: '{t("security.subtitle")}' },
]);

// ============================================================================
// Add translations to all locale files
// ============================================================================
const MESSAGES_DIR = path.join(BASE, 'messages');
const LOCALES = ['en', 'es', 'pt-BR', 'fr', 'ar', 'de', 'hi', 'zh'];

const superAdminKeys = {
  en: {
    "inbox.title": "Inbox",
    "inbox.subtitle": "Contact form submissions and custom plan requests",
    "inbox.totalSubmissions": "Total Submissions",
    "inbox.new": "New",
    "inbox.read": "Read",
    "inbox.archived": "Archived",
    "supportTickets.title": "Support Tickets",
    "supportTickets.subtitle": "Manage and respond to customer support requests",
    "supportTickets.totalTickets": "Total Tickets",
    "supportTickets.open": "Open",
    "supportTickets.inProgress": "In Progress",
    "supportTickets.avgResolution": "Avg Resolution",
    "systemHealth.title": "System Health",
    "systemHealth.subtitle": "Platform infrastructure overview and database statistics",
    "systemHealth.refresh": "Refresh",
    "systemHealth.totalUsers": "Total Users",
    "systemHealth.totalCompanies": "Total Companies",
    "systemHealth.totalRecords": "Total Records",
    "systemHealth.systemStatus": "System Status",
    "emailTemplates.title": "Email Templates",
    "emailTemplates.subtitle": "Manage email templates sent to users and companies",
  },
  es: {
    "inbox.title": "Bandeja de Entrada",
    "inbox.subtitle": "Envíos de formularios de contacto y solicitudes de planes personalizados",
    "inbox.totalSubmissions": "Total de Envíos",
    "inbox.new": "Nuevos",
    "inbox.read": "Leídos",
    "inbox.archived": "Archivados",
    "supportTickets.title": "Tickets de Soporte",
    "supportTickets.subtitle": "Gestione y responda las solicitudes de soporte al cliente",
    "supportTickets.totalTickets": "Total de Tickets",
    "supportTickets.open": "Abiertos",
    "supportTickets.inProgress": "En Progreso",
    "supportTickets.avgResolution": "Resolución Promedio",
    "systemHealth.title": "Estado del Sistema",
    "systemHealth.subtitle": "Resumen de infraestructura y estadísticas de la base de datos",
    "systemHealth.refresh": "Actualizar",
    "systemHealth.totalUsers": "Total de Usuarios",
    "systemHealth.totalCompanies": "Total de Empresas",
    "systemHealth.totalRecords": "Total de Registros",
    "systemHealth.systemStatus": "Estado del Sistema",
    "emailTemplates.title": "Plantillas de Email",
    "emailTemplates.subtitle": "Gestione plantillas de email enviadas a usuarios y empresas",
  },
  "pt-BR": {
    "inbox.title": "Caixa de Entrada",
    "inbox.subtitle": "Envios de formulários de contato e solicitações de planos personalizados",
    "inbox.totalSubmissions": "Total de Envios",
    "inbox.new": "Novos",
    "inbox.read": "Lidos",
    "inbox.archived": "Arquivados",
    "supportTickets.title": "Tickets de Suporte",
    "supportTickets.subtitle": "Gerencie e responda às solicitações de suporte ao cliente",
    "supportTickets.totalTickets": "Total de Tickets",
    "supportTickets.open": "Abertos",
    "supportTickets.inProgress": "Em Andamento",
    "supportTickets.avgResolution": "Resolução Média",
    "systemHealth.title": "Saúde do Sistema",
    "systemHealth.subtitle": "Visão geral da infraestrutura e estatísticas do banco de dados",
    "systemHealth.refresh": "Atualizar",
    "systemHealth.totalUsers": "Total de Usuários",
    "systemHealth.totalCompanies": "Total de Empresas",
    "systemHealth.totalRecords": "Total de Registros",
    "systemHealth.systemStatus": "Status do Sistema",
    "emailTemplates.title": "Modelos de E-mail",
    "emailTemplates.subtitle": "Gerencie modelos de e-mail enviados a usuários e empresas",
  },
  fr: {
    "inbox.title": "Boîte de Réception",
    "inbox.subtitle": "Soumissions de formulaires de contact et demandes de plans personnalisés",
    "inbox.totalSubmissions": "Total des Soumissions",
    "inbox.new": "Nouveaux",
    "inbox.read": "Lus",
    "inbox.archived": "Archivés",
    "supportTickets.title": "Tickets de Support",
    "supportTickets.subtitle": "Gérez et répondez aux demandes de support client",
    "supportTickets.totalTickets": "Total des Tickets",
    "supportTickets.open": "Ouverts",
    "supportTickets.inProgress": "En Cours",
    "supportTickets.avgResolution": "Résolution Moyenne",
    "systemHealth.title": "Santé du Système",
    "systemHealth.subtitle": "Aperçu de l'infrastructure et statistiques de la base de données",
    "systemHealth.refresh": "Actualiser",
    "systemHealth.totalUsers": "Total des Utilisateurs",
    "systemHealth.totalCompanies": "Total des Entreprises",
    "systemHealth.totalRecords": "Total des Enregistrements",
    "systemHealth.systemStatus": "Statut du Système",
    "emailTemplates.title": "Modèles d'E-mail",
    "emailTemplates.subtitle": "Gérez les modèles d'e-mail envoyés aux utilisateurs et entreprises",
  },
  ar: {
    "inbox.title": "صندوق الوارد",
    "inbox.subtitle": "نماذج الاتصال وطلبات الخطط المخصصة",
    "inbox.totalSubmissions": "إجمالي الإرسالات",
    "inbox.new": "جديد",
    "inbox.read": "مقروء",
    "inbox.archived": "مؤرشف",
    "supportTickets.title": "تذاكر الدعم",
    "supportTickets.subtitle": "إدارة والرد على طلبات دعم العملاء",
    "supportTickets.totalTickets": "إجمالي التذاكر",
    "supportTickets.open": "مفتوحة",
    "supportTickets.inProgress": "قيد التنفيذ",
    "supportTickets.avgResolution": "متوسط الحل",
    "systemHealth.title": "صحة النظام",
    "systemHealth.subtitle": "نظرة عامة على البنية التحتية وإحصائيات قاعدة البيانات",
    "systemHealth.refresh": "تحديث",
    "systemHealth.totalUsers": "إجمالي المستخدمين",
    "systemHealth.totalCompanies": "إجمالي الشركات",
    "systemHealth.totalRecords": "إجمالي السجلات",
    "systemHealth.systemStatus": "حالة النظام",
    "emailTemplates.title": "قوالب البريد الإلكتروني",
    "emailTemplates.subtitle": "إدارة قوالب البريد الإلكتروني المرسلة للمستخدمين والشركات",
  },
  de: {
    "inbox.title": "Posteingang",
    "inbox.subtitle": "Kontaktformular-Einreichungen und individuelle Plananfragen",
    "inbox.totalSubmissions": "Gesamteinreichungen",
    "inbox.new": "Neu",
    "inbox.read": "Gelesen",
    "inbox.archived": "Archiviert",
    "supportTickets.title": "Support-Tickets",
    "supportTickets.subtitle": "Verwalten und beantworten Sie Kundenanfragen",
    "supportTickets.totalTickets": "Gesamt-Tickets",
    "supportTickets.open": "Offen",
    "supportTickets.inProgress": "In Bearbeitung",
    "supportTickets.avgResolution": "Durchschn. Lösung",
    "systemHealth.title": "Systemzustand",
    "systemHealth.subtitle": "Infrastrukturübersicht und Datenbankstatistiken",
    "systemHealth.refresh": "Aktualisieren",
    "systemHealth.totalUsers": "Gesamtbenutzer",
    "systemHealth.totalCompanies": "Gesamtunternehmen",
    "systemHealth.totalRecords": "Gesamtdatensätze",
    "systemHealth.systemStatus": "Systemstatus",
    "emailTemplates.title": "E-Mail-Vorlagen",
    "emailTemplates.subtitle": "Verwalten Sie E-Mail-Vorlagen für Benutzer und Unternehmen",
  },
  hi: {
    "inbox.title": "इनबॉक्स",
    "inbox.subtitle": "संपर्क फ़ॉर्म प्रस्तुतियां और कस्टम योजना अनुरोध",
    "inbox.totalSubmissions": "कुल प्रस्तुतियां",
    "inbox.new": "नया",
    "inbox.read": "पढ़ा हुआ",
    "inbox.archived": "संग्रहीत",
    "supportTickets.title": "सहायता टिकट",
    "supportTickets.subtitle": "ग्राहक सहायता अनुरोधों का प्रबंधन और उत्तर दें",
    "supportTickets.totalTickets": "कुल टिकट",
    "supportTickets.open": "खुले",
    "supportTickets.inProgress": "प्रगति में",
    "supportTickets.avgResolution": "औसत समाधान",
    "systemHealth.title": "सिस्टम स्वास्थ्य",
    "systemHealth.subtitle": "प्लेटफ़ॉर्म अवसंरचना अवलोकन और डेटाबेस आंकड़े",
    "systemHealth.refresh": "ताज़ा करें",
    "systemHealth.totalUsers": "कुल उपयोगकर्ता",
    "systemHealth.totalCompanies": "कुल कंपनियां",
    "systemHealth.totalRecords": "कुल रिकॉर्ड",
    "systemHealth.systemStatus": "सिस्टम स्थिति",
    "emailTemplates.title": "ईमेल टेम्पलेट",
    "emailTemplates.subtitle": "उपयोगकर्ताओं और कंपनियों को भेजे जाने वाले ईमेल टेम्पलेट प्रबंधित करें",
  },
  zh: {
    "inbox.title": "收件箱",
    "inbox.subtitle": "联系表单提交和自定义计划请求",
    "inbox.totalSubmissions": "总提交数",
    "inbox.new": "新的",
    "inbox.read": "已读",
    "inbox.archived": "已归档",
    "supportTickets.title": "支持工单",
    "supportTickets.subtitle": "管理和回复客户支持请求",
    "supportTickets.totalTickets": "总工单数",
    "supportTickets.open": "未处理",
    "supportTickets.inProgress": "处理中",
    "supportTickets.avgResolution": "平均解决时间",
    "systemHealth.title": "系统健康",
    "systemHealth.subtitle": "平台基础设施概况和数据库统计",
    "systemHealth.refresh": "刷新",
    "systemHealth.totalUsers": "总用户数",
    "systemHealth.totalCompanies": "总公司数",
    "systemHealth.totalRecords": "总记录数",
    "systemHealth.systemStatus": "系统状态",
    "emailTemplates.title": "邮件模板",
    "emailTemplates.subtitle": "管理发送给用户和公司的邮件模板",
  },
};

const adminPanelKeys = {
  en: {
    "automation.title": "Automation",
    "automation.subtitle": "Create rules to automate repetitive tasks and workflows",
    "automation.viewLogs": "View Logs",
    "automation.createRule": "Create Rule",
    "automationLogs.title": "Automation Logs",
    "automationLogs.subtitle": "Review execution history and debug automation rules",
    "automationLogs.backToRules": "Back to Rules",
    "integrations.title": "Integrations",
    "integrations.subtitle": "Connect third-party services to sync data and automate workflows",
    "security.title": "Security",
    "security.subtitle": "Manage password policies, two-factor authentication, and session settings",
  },
  es: {
    "automation.title": "Automatización",
    "automation.subtitle": "Cree reglas para automatizar tareas y flujos de trabajo repetitivos",
    "automation.viewLogs": "Ver Registros",
    "automation.createRule": "Crear Regla",
    "automationLogs.title": "Registros de Automatización",
    "automationLogs.subtitle": "Revise el historial de ejecución y depure reglas de automatización",
    "automationLogs.backToRules": "Volver a Reglas",
    "integrations.title": "Integraciones",
    "integrations.subtitle": "Conecte servicios de terceros para sincronizar datos y automatizar flujos",
    "security.title": "Seguridad",
    "security.subtitle": "Gestione políticas de contraseñas, autenticación de dos factores y configuración de sesiones",
  },
  "pt-BR": {
    "automation.title": "Automação",
    "automation.subtitle": "Crie regras para automatizar tarefas e fluxos de trabalho repetitivos",
    "automation.viewLogs": "Ver Logs",
    "automation.createRule": "Criar Regra",
    "automationLogs.title": "Logs de Automação",
    "automationLogs.subtitle": "Revise o histórico de execução e depure regras de automação",
    "automationLogs.backToRules": "Voltar para Regras",
    "integrations.title": "Integrações",
    "integrations.subtitle": "Conecte serviços de terceiros para sincronizar dados e automatizar fluxos",
    "security.title": "Segurança",
    "security.subtitle": "Gerencie políticas de senha, autenticação de dois fatores e configurações de sessão",
  },
  fr: {
    "automation.title": "Automatisation",
    "automation.subtitle": "Créez des règles pour automatiser les tâches répétitives",
    "automation.viewLogs": "Voir les Journaux",
    "automation.createRule": "Créer une Règle",
    "automationLogs.title": "Journaux d'Automatisation",
    "automationLogs.subtitle": "Consultez l'historique d'exécution et déboguez les règles",
    "automationLogs.backToRules": "Retour aux Règles",
    "integrations.title": "Intégrations",
    "integrations.subtitle": "Connectez des services tiers pour synchroniser les données et automatiser",
    "security.title": "Sécurité",
    "security.subtitle": "Gérez les politiques de mot de passe, l'authentification à deux facteurs et les sessions",
  },
  ar: {
    "automation.title": "الأتمتة",
    "automation.subtitle": "أنشئ قواعد لأتمتة المهام وسير العمل المتكررة",
    "automation.viewLogs": "عرض السجلات",
    "automation.createRule": "إنشاء قاعدة",
    "automationLogs.title": "سجلات الأتمتة",
    "automationLogs.subtitle": "مراجعة سجل التنفيذ وتصحيح قواعد الأتمتة",
    "automationLogs.backToRules": "العودة إلى القواعد",
    "integrations.title": "التكاملات",
    "integrations.subtitle": "اربط خدمات الطرف الثالث لمزامنة البيانات وأتمتة سير العمل",
    "security.title": "الأمان",
    "security.subtitle": "إدارة سياسات كلمات المرور والمصادقة الثنائية وإعدادات الجلسات",
  },
  de: {
    "automation.title": "Automatisierung",
    "automation.subtitle": "Erstellen Sie Regeln zur Automatisierung wiederkehrender Aufgaben",
    "automation.viewLogs": "Protokolle anzeigen",
    "automation.createRule": "Regel erstellen",
    "automationLogs.title": "Automatisierungsprotokolle",
    "automationLogs.subtitle": "Überprüfen Sie den Ausführungsverlauf und debuggen Sie Regeln",
    "automationLogs.backToRules": "Zurück zu Regeln",
    "integrations.title": "Integrationen",
    "integrations.subtitle": "Verbinden Sie Drittanbieter-Dienste zur Datensynchronisation",
    "security.title": "Sicherheit",
    "security.subtitle": "Verwalten Sie Passwortrichtlinien, Zwei-Faktor-Authentifizierung und Sitzungen",
  },
  hi: {
    "automation.title": "स्वचालन",
    "automation.subtitle": "दोहराव कार्यों और वर्कफ़्लो को स्वचालित करने के लिए नियम बनाएं",
    "automation.viewLogs": "लॉग देखें",
    "automation.createRule": "नियम बनाएं",
    "automationLogs.title": "स्वचालन लॉग",
    "automationLogs.subtitle": "निष्पादन इतिहास की समीक्षा करें और स्वचालन नियमों को डिबग करें",
    "automationLogs.backToRules": "नियमों पर वापस जाएं",
    "integrations.title": "एकीकरण",
    "integrations.subtitle": "डेटा सिंक और वर्कफ़्लो स्वचालित करने के लिए तृतीय-पक्ष सेवाएं कनेक्ट करें",
    "security.title": "सुरक्षा",
    "security.subtitle": "पासवर्ड नीतियां, दो-कारक प्रमाणीकरण और सत्र सेटिंग्स प्रबंधित करें",
  },
  zh: {
    "automation.title": "自动化",
    "automation.subtitle": "创建规则以自动化重复任务和工作流程",
    "automation.viewLogs": "查看日志",
    "automation.createRule": "创建规则",
    "automationLogs.title": "自动化日志",
    "automationLogs.subtitle": "查看执行历史和调试自动化规则",
    "automationLogs.backToRules": "返回规则",
    "integrations.title": "集成",
    "integrations.subtitle": "连接第三方服务以同步数据和自动化工作流程",
    "security.title": "安全",
    "security.subtitle": "管理密码策略、双因素认证和会话设置",
  },
};

for (const locale of LOCALES) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!content.superAdmin) content.superAdmin = {};
  const saKeys = superAdminKeys[locale] || superAdminKeys.en;
  for (const [key, value] of Object.entries(saKeys)) {
    content.superAdmin[key] = value;
  }

  if (!content.adminPanel) content.adminPanel = {};
  const apKeys = adminPanelKeys[locale] || adminPanelKeys.en;
  for (const [key, value] of Object.entries(apKeys)) {
    content.adminPanel[key] = value;
  }

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
  console.log(`Updated ${locale}.json`);
}

console.log('Done with batch 3!');
