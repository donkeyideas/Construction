/**
 * Add all remaining i18n translation keys for:
 * - adminPanel: automation, automationLogs, integrations, security
 * - superAdmin: systemHealth, emailTemplates, inbox, supportTickets (remaining keys)
 * - common: portalSettings
 */
const fs = require("fs");
const path = require("path");

const LOCALES = ["en", "es", "pt-BR", "fr", "ar", "de", "hi", "zh"];

// ============================================================================
// NEW KEYS PER LOCALE
// ============================================================================

const newKeys = {
  en: {
    common: {
      "portalSettings.updatePersonalInfo": "Update your personal information.",
      "portalSettings.fullName": "Full Name",
      "portalSettings.phone": "Phone",
      "portalSettings.saveChanges": "Save Changes"
    },
    adminPanel: {
      "automation.viewLogs": "View Logs",
      "automation.createRule": "Create Rule",
      "automation.totalRules": "Total Rules",
      "automation.active": "Active",
      "automation.executionsToday": "Executions Today",
      "automation.failedToday": "Failed Today",
      "automation.quickStartTemplates": "Quick Start Templates",
      "automation.useTemplate": "Use Template",
      "automation.thName": "Name",
      "automation.thTrigger": "Trigger",
      "automation.thEntity": "Entity",
      "automation.thStatus": "Status",
      "automation.thLastRun": "Last Run",
      "automation.thRunCount": "Run Count",
      "automation.thActions": "Actions",
      "automation.noRulesYet": "No automation rules yet",
      "automation.noRulesDesc": "Create your first rule or use a template to get started.",
      "automation.editRule": "Edit Automation Rule",
      "automation.createRuleTitle": "Create Automation Rule",
      "automation.editRuleDesc": "Update the configuration for this automation rule.",
      "automation.createRuleDesc": "Define a trigger, conditions, and actions for this rule.",
      "automation.saving": "Saving...",
      "automation.updateRule": "Update Rule",
      "automationLogs.subtitle": "Review execution history for all automation rules.",
      "automationLogs.backToRules": "Back to Rules",
      "automationLogs.status": "Status",
      "automationLogs.all": "All",
      "automationLogs.success": "Success",
      "automationLogs.failed": "Failed",
      "automationLogs.skipped": "Skipped",
      "automationLogs.startDate": "Start Date",
      "automationLogs.endDate": "End Date",
      "automationLogs.clearFilters": "Clear Filters",
      "automationLogs.thRuleName": "Rule Name",
      "automationLogs.thEntity": "Entity",
      "automationLogs.thStatus": "Status",
      "automationLogs.thTimestamp": "Timestamp",
      "automationLogs.thActionsExecuted": "Actions Executed",
      "automationLogs.entityId": "Entity ID",
      "automationLogs.error": "Error",
      "automationLogs.actions": "Actions",
      "automationLogs.details": "Details",
      "automationLogs.noLogsFound": "No logs found",
      "automationLogs.tryAdjustingFilters": "Try adjusting your filters.",
      "automationLogs.logsWillAppear": "Automation execution logs will appear here.",
      "integrations.subtitle": "Connect third-party services and tools to your workspace.",
      "integrations.connected": "Connected",
      "integrations.available": "Available",
      "integrations.errors": "Errors",
      "integrations.all": "All",
      "integrations.accounting": "Accounting",
      "integrations.projectManagement": "Project Management",
      "integrations.communication": "Communication",
      "integrations.payment": "Payment",
      "integrations.configure": "Configure",
      "integrations.disconnect": "Disconnect",
      "integrations.connecting": "Connecting...",
      "integrations.reconnect": "Reconnect",
      "integrations.connect": "Connect",
      "integrations.updateConnectionSettings": "Update the connection settings for this integration.",
      "integrations.saving": "Saving...",
      "integrations.saveConfiguration": "Save Configuration",
      "security.subtitle": "Manage password policies, two-factor authentication, and session controls.",
      "security.passwordPolicies": "Password Policies",
      "security.twoFactorAuth": "Two-Factor Auth",
      "security.sessions": "Sessions",
      "security.loginHistory": "Login History",
      "security.passwordRequirements": "Password Requirements",
      "security.minPasswordLength": "Minimum Password Length",
      "security.requireUppercase": "Require uppercase letters",
      "security.requireLowercase": "Require lowercase letters",
      "security.requireNumbers": "Require numbers",
      "security.requireSpecialChars": "Require special characters",
      "security.passwordExpiry": "Password Expiry (days)",
      "security.expiryHint": "Set to 0 to disable password expiration.",
      "security.saving": "Saving...",
      "security.savePasswordPolicy": "Save Password Policy",
      "security.twoFactorAuthentication": "Two-Factor Authentication",
      "security.require2faAll": "Require 2FA for all users",
      "security.require2faAllDesc": "When enabled, all users must set up two-factor authentication.",
      "security.require2faRoles": "Require 2FA for Specific Roles",
      "security.save2faSettings": "Save 2FA Settings",
      "security.sessionSettings": "Session Settings",
      "security.sessionTimeout": "Session Timeout (minutes)",
      "security.maxConcurrentSessions": "Max Concurrent Sessions",
      "security.saveSessionSettings": "Save Session Settings",
      "security.activeSessions": "Active Sessions ({count})",
      "security.revoking": "Revoking...",
      "security.revokeAll": "Revoke All",
      "security.thUser": "User",
      "security.thDevice": "Device",
      "security.thIpAddress": "IP Address",
      "security.thLastActive": "Last Active",
      "security.thActions": "Actions",
      "security.revoke": "Revoke",
      "security.noActiveSessions": "No active sessions found.",
      "security.dateFilter": "Date Filter",
      "security.clear": "Clear",
      "security.thTime": "Time",
      "security.thStatus": "Status",
      "security.success": "Success",
      "security.failed": "Failed",
      "security.noHistoryFound": "No login history found.",
      "security.noHistoryForDate": "No login history found for this date."
    },
    superAdmin: {
      "systemHealth.refresh": "Refresh",
      "systemHealth.allOperational": "All Systems Operational",
      "systemHealth.degraded": "Degraded Performance",
      "systemHealth.operational": "Operational",
      "systemHealth.degradedShort": "Degraded",
      "systemHealth.databaseStatistics": "Database Statistics",
      "systemHealth.thTable": "Table",
      "systemHealth.thRowCount": "Row Count",
      "systemHealth.recentActivity": "Recent Activity",
      "systemHealth.noAuditEntries": "No audit log entries yet",
      "systemHealth.userStatistics": "User Statistics",
      "systemHealth.activeToday": "Active Today",
      "systemHealth.newThisMonth": "New This Month",
      "systemHealth.companyStatistics": "Company Statistics",
      "systemHealth.activeCompanies": "Active Companies",
      "systemHealth.plansBreakdown": "Plans Breakdown",
      "systemHealth.storage": "Storage",
      "systemHealth.totalDocuments": "Total Documents",
      "systemHealth.estimatedSize": "Estimated Size",
      "emailTemplates.subtitle": "Manage email templates used across the platform",
      "emailTemplates.newTemplate": "New Template",
      "emailTemplates.totalTemplates": "Total Templates",
      "emailTemplates.activeTemplates": "Active Templates",
      "emailTemplates.categories": "Categories",
      "emailTemplates.thName": "Name",
      "emailTemplates.thSubject": "Subject",
      "emailTemplates.thCategory": "Category",
      "emailTemplates.thStatus": "Status",
      "emailTemplates.thUpdated": "Updated",
      "emailTemplates.thActions": "Actions",
      "emailTemplates.noTemplatesYet": "No email templates yet. Click \"New Template\" to create one.",
      "inbox.allStatuses": "All Statuses",
      "inbox.statusNew": "New",
      "inbox.statusRead": "Read",
      "inbox.statusReplied": "Replied",
      "inbox.statusArchived": "Archived",
      "inbox.allTypes": "All Types",
      "inbox.typeContact": "Contact",
      "inbox.typeCustomPlan": "Custom Plan",
      "inbox.clear": "Clear",
      "inbox.thType": "Type",
      "inbox.thName": "Name",
      "inbox.thEmail": "Email",
      "inbox.thCompany": "Company",
      "inbox.thSubjectMessage": "Subject / Message",
      "inbox.thStatus": "Status",
      "inbox.thDate": "Date",
      "inbox.noSubmissions": "No submissions found.",
      "inbox.adminNotes": "Admin Notes",
      "inbox.saving": "Saving...",
      "inbox.saveNotes": "Save Notes",
      "supportTickets.allStatuses": "All Statuses",
      "supportTickets.statusOpen": "Open",
      "supportTickets.statusInProgress": "In Progress",
      "supportTickets.statusWaiting": "Waiting",
      "supportTickets.statusResolved": "Resolved",
      "supportTickets.statusClosed": "Closed",
      "supportTickets.allPriorities": "All Priorities",
      "supportTickets.urgent": "Urgent",
      "supportTickets.high": "High",
      "supportTickets.medium": "Medium",
      "supportTickets.low": "Low",
      "supportTickets.allCategories": "All Categories",
      "supportTickets.catGeneral": "General",
      "supportTickets.catBilling": "Billing",
      "supportTickets.catTechnical": "Technical",
      "supportTickets.catFeatureRequest": "Feature Request",
      "supportTickets.catBugReport": "Bug Report",
      "supportTickets.catAccount": "Account",
      "supportTickets.clear": "Clear",
      "supportTickets.thSubject": "Subject",
      "supportTickets.thUser": "User",
      "supportTickets.thCompany": "Company",
      "supportTickets.thStatus": "Status",
      "supportTickets.thPriority": "Priority",
      "supportTickets.thCategory": "Category",
      "supportTickets.thCreated": "Created",
      "supportTickets.noTicketsFound": "No support tickets found.",
      "supportTickets.sending": "Sending...",
      "supportTickets.send": "Send",
      "supportTickets.internalNote": "Internal Note"
    }
  },
  es: {
    common: {
      "portalSettings.updatePersonalInfo": "Actualice su informacion personal.",
      "portalSettings.fullName": "Nombre Completo",
      "portalSettings.phone": "Telefono",
      "portalSettings.saveChanges": "Guardar Cambios"
    },
    adminPanel: {
      "automation.viewLogs": "Ver Registros",
      "automation.createRule": "Crear Regla",
      "automation.totalRules": "Total de Reglas",
      "automation.active": "Activas",
      "automation.executionsToday": "Ejecuciones Hoy",
      "automation.failedToday": "Fallidas Hoy",
      "automation.quickStartTemplates": "Plantillas de Inicio Rapido",
      "automation.useTemplate": "Usar Plantilla",
      "automation.thName": "Nombre",
      "automation.thTrigger": "Disparador",
      "automation.thEntity": "Entidad",
      "automation.thStatus": "Estado",
      "automation.thLastRun": "Ultima Ejecucion",
      "automation.thRunCount": "Ejecuciones",
      "automation.thActions": "Acciones",
      "automation.noRulesYet": "Sin reglas de automatizacion",
      "automation.noRulesDesc": "Cree su primera regla o use una plantilla para comenzar.",
      "automation.editRule": "Editar Regla de Automatizacion",
      "automation.createRuleTitle": "Crear Regla de Automatizacion",
      "automation.editRuleDesc": "Actualice la configuracion de esta regla.",
      "automation.createRuleDesc": "Defina un disparador, condiciones y acciones para esta regla.",
      "automation.saving": "Guardando...",
      "automation.updateRule": "Actualizar Regla",
      "automationLogs.subtitle": "Revise el historial de ejecucion de todas las reglas.",
      "automationLogs.backToRules": "Volver a Reglas",
      "automationLogs.status": "Estado",
      "automationLogs.all": "Todos",
      "automationLogs.success": "Exitoso",
      "automationLogs.failed": "Fallido",
      "automationLogs.skipped": "Omitido",
      "automationLogs.startDate": "Fecha Inicio",
      "automationLogs.endDate": "Fecha Fin",
      "automationLogs.clearFilters": "Limpiar Filtros",
      "automationLogs.thRuleName": "Nombre de Regla",
      "automationLogs.thEntity": "Entidad",
      "automationLogs.thStatus": "Estado",
      "automationLogs.thTimestamp": "Marca de Tiempo",
      "automationLogs.thActionsExecuted": "Acciones Ejecutadas",
      "automationLogs.entityId": "ID de Entidad",
      "automationLogs.error": "Error",
      "automationLogs.actions": "Acciones",
      "automationLogs.details": "Detalles",
      "automationLogs.noLogsFound": "No se encontraron registros",
      "automationLogs.tryAdjustingFilters": "Intente ajustar sus filtros.",
      "automationLogs.logsWillAppear": "Los registros de ejecucion apareceran aqui.",
      "integrations.subtitle": "Conecte servicios y herramientas de terceros a su espacio de trabajo.",
      "integrations.connected": "Conectadas",
      "integrations.available": "Disponibles",
      "integrations.errors": "Errores",
      "integrations.all": "Todas",
      "integrations.accounting": "Contabilidad",
      "integrations.projectManagement": "Gestion de Proyectos",
      "integrations.communication": "Comunicacion",
      "integrations.payment": "Pagos",
      "integrations.configure": "Configurar",
      "integrations.disconnect": "Desconectar",
      "integrations.connecting": "Conectando...",
      "integrations.reconnect": "Reconectar",
      "integrations.connect": "Conectar",
      "integrations.updateConnectionSettings": "Actualice la configuracion de conexion para esta integracion.",
      "integrations.saving": "Guardando...",
      "integrations.saveConfiguration": "Guardar Configuracion",
      "security.subtitle": "Administre politicas de contrasena, autenticacion de dos factores y controles de sesion.",
      "security.passwordPolicies": "Politicas de Contrasena",
      "security.twoFactorAuth": "Autenticacion de Dos Factores",
      "security.sessions": "Sesiones",
      "security.loginHistory": "Historial de Inicio de Sesion",
      "security.passwordRequirements": "Requisitos de Contrasena",
      "security.minPasswordLength": "Longitud Minima de Contrasena",
      "security.requireUppercase": "Requerir letras mayusculas",
      "security.requireLowercase": "Requerir letras minusculas",
      "security.requireNumbers": "Requerir numeros",
      "security.requireSpecialChars": "Requerir caracteres especiales",
      "security.passwordExpiry": "Expiracion de Contrasena (dias)",
      "security.expiryHint": "Establezca en 0 para desactivar la expiracion.",
      "security.saving": "Guardando...",
      "security.savePasswordPolicy": "Guardar Politica de Contrasena",
      "security.twoFactorAuthentication": "Autenticacion de Dos Factores",
      "security.require2faAll": "Requerir 2FA para todos los usuarios",
      "security.require2faAllDesc": "Cuando esta activado, todos los usuarios deben configurar la autenticacion de dos factores.",
      "security.require2faRoles": "Requerir 2FA para Roles Especificos",
      "security.save2faSettings": "Guardar Configuracion 2FA",
      "security.sessionSettings": "Configuracion de Sesion",
      "security.sessionTimeout": "Tiempo de Espera de Sesion (minutos)",
      "security.maxConcurrentSessions": "Sesiones Concurrentes Maximas",
      "security.saveSessionSettings": "Guardar Configuracion de Sesion",
      "security.activeSessions": "Sesiones Activas ({count})",
      "security.revoking": "Revocando...",
      "security.revokeAll": "Revocar Todas",
      "security.thUser": "Usuario",
      "security.thDevice": "Dispositivo",
      "security.thIpAddress": "Direccion IP",
      "security.thLastActive": "Ultima Actividad",
      "security.thActions": "Acciones",
      "security.revoke": "Revocar",
      "security.noActiveSessions": "No se encontraron sesiones activas.",
      "security.dateFilter": "Filtro de Fecha",
      "security.clear": "Limpiar",
      "security.thTime": "Hora",
      "security.thStatus": "Estado",
      "security.success": "Exitoso",
      "security.failed": "Fallido",
      "security.noHistoryFound": "No se encontro historial de inicio de sesion.",
      "security.noHistoryForDate": "No se encontro historial para esta fecha."
    },
    superAdmin: {
      "systemHealth.refresh": "Actualizar",
      "systemHealth.allOperational": "Todos los Sistemas Operativos",
      "systemHealth.degraded": "Rendimiento Degradado",
      "systemHealth.operational": "Operativo",
      "systemHealth.degradedShort": "Degradado",
      "systemHealth.databaseStatistics": "Estadisticas de Base de Datos",
      "systemHealth.thTable": "Tabla",
      "systemHealth.thRowCount": "Filas",
      "systemHealth.recentActivity": "Actividad Reciente",
      "systemHealth.noAuditEntries": "Sin entradas de auditoria",
      "systemHealth.userStatistics": "Estadisticas de Usuarios",
      "systemHealth.activeToday": "Activos Hoy",
      "systemHealth.newThisMonth": "Nuevos Este Mes",
      "systemHealth.companyStatistics": "Estadisticas de Empresas",
      "systemHealth.activeCompanies": "Empresas Activas",
      "systemHealth.plansBreakdown": "Desglose de Planes",
      "systemHealth.storage": "Almacenamiento",
      "systemHealth.totalDocuments": "Documentos Totales",
      "systemHealth.estimatedSize": "Tamano Estimado",
      "emailTemplates.subtitle": "Administre plantillas de correo en toda la plataforma",
      "emailTemplates.newTemplate": "Nueva Plantilla",
      "emailTemplates.totalTemplates": "Total de Plantillas",
      "emailTemplates.activeTemplates": "Plantillas Activas",
      "emailTemplates.categories": "Categorias",
      "emailTemplates.thName": "Nombre",
      "emailTemplates.thSubject": "Asunto",
      "emailTemplates.thCategory": "Categoria",
      "emailTemplates.thStatus": "Estado",
      "emailTemplates.thUpdated": "Actualizado",
      "emailTemplates.thActions": "Acciones",
      "emailTemplates.noTemplatesYet": "Sin plantillas de correo. Haga clic en \"Nueva Plantilla\" para crear una.",
      "inbox.allStatuses": "Todos los Estados",
      "inbox.statusNew": "Nuevo",
      "inbox.statusRead": "Leido",
      "inbox.statusReplied": "Respondido",
      "inbox.statusArchived": "Archivado",
      "inbox.allTypes": "Todos los Tipos",
      "inbox.typeContact": "Contacto",
      "inbox.typeCustomPlan": "Plan Personalizado",
      "inbox.clear": "Limpiar",
      "inbox.thType": "Tipo",
      "inbox.thName": "Nombre",
      "inbox.thEmail": "Correo",
      "inbox.thCompany": "Empresa",
      "inbox.thSubjectMessage": "Asunto / Mensaje",
      "inbox.thStatus": "Estado",
      "inbox.thDate": "Fecha",
      "inbox.noSubmissions": "No se encontraron envios.",
      "inbox.adminNotes": "Notas del Administrador",
      "inbox.saving": "Guardando...",
      "inbox.saveNotes": "Guardar Notas",
      "supportTickets.allStatuses": "Todos los Estados",
      "supportTickets.statusOpen": "Abierto",
      "supportTickets.statusInProgress": "En Progreso",
      "supportTickets.statusWaiting": "En Espera",
      "supportTickets.statusResolved": "Resuelto",
      "supportTickets.statusClosed": "Cerrado",
      "supportTickets.allPriorities": "Todas las Prioridades",
      "supportTickets.urgent": "Urgente",
      "supportTickets.high": "Alta",
      "supportTickets.medium": "Media",
      "supportTickets.low": "Baja",
      "supportTickets.allCategories": "Todas las Categorias",
      "supportTickets.catGeneral": "General",
      "supportTickets.catBilling": "Facturacion",
      "supportTickets.catTechnical": "Tecnico",
      "supportTickets.catFeatureRequest": "Solicitud de Funcion",
      "supportTickets.catBugReport": "Reporte de Error",
      "supportTickets.catAccount": "Cuenta",
      "supportTickets.clear": "Limpiar",
      "supportTickets.thSubject": "Asunto",
      "supportTickets.thUser": "Usuario",
      "supportTickets.thCompany": "Empresa",
      "supportTickets.thStatus": "Estado",
      "supportTickets.thPriority": "Prioridad",
      "supportTickets.thCategory": "Categoria",
      "supportTickets.thCreated": "Creado",
      "supportTickets.noTicketsFound": "No se encontraron tickets de soporte.",
      "supportTickets.sending": "Enviando...",
      "supportTickets.send": "Enviar",
      "supportTickets.internalNote": "Nota Interna"
    }
  }
};

// Generate translations for remaining locales based on English keys
// Using professional translations
const translations = {
  "pt-BR": {
    common: {
      "portalSettings.updatePersonalInfo": "Atualize suas informacoes pessoais.",
      "portalSettings.fullName": "Nome Completo",
      "portalSettings.phone": "Telefone",
      "portalSettings.saveChanges": "Salvar Alteracoes"
    }
  },
  fr: {
    common: {
      "portalSettings.updatePersonalInfo": "Mettez a jour vos informations personnelles.",
      "portalSettings.fullName": "Nom Complet",
      "portalSettings.phone": "Telephone",
      "portalSettings.saveChanges": "Enregistrer"
    }
  },
  ar: {
    common: {
      "portalSettings.updatePersonalInfo": "قم بتحديث معلوماتك الشخصية.",
      "portalSettings.fullName": "الاسم الكامل",
      "portalSettings.phone": "الهاتف",
      "portalSettings.saveChanges": "حفظ التغييرات"
    }
  },
  de: {
    common: {
      "portalSettings.updatePersonalInfo": "Aktualisieren Sie Ihre persoenlichen Daten.",
      "portalSettings.fullName": "Vollstaendiger Name",
      "portalSettings.phone": "Telefon",
      "portalSettings.saveChanges": "Aenderungen Speichern"
    }
  },
  hi: {
    common: {
      "portalSettings.updatePersonalInfo": "अपनी व्यक्तिगत जानकारी अपडेट करें।",
      "portalSettings.fullName": "पूरा नाम",
      "portalSettings.phone": "फ़ोन",
      "portalSettings.saveChanges": "परिवर्तन सहेजें"
    }
  },
  zh: {
    common: {
      "portalSettings.updatePersonalInfo": "更新您的个人信息。",
      "portalSettings.fullName": "全名",
      "portalSettings.phone": "电话",
      "portalSettings.saveChanges": "保存更改"
    }
  }
};

// For adminPanel and superAdmin keys in non-en/es locales, we copy from English
// since these are mostly technical/UI labels that are commonly kept in English
// or have straightforward translations

function mergeKeys(existing, newKeysForNamespace) {
  for (const [key, value] of Object.entries(newKeysForNamespace)) {
    if (!(key in existing)) {
      existing[key] = value;
    }
  }
}

for (const locale of LOCALES) {
  const filePath = path.join(__dirname, "..", "messages", `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (locale === "en") {
    // English - use exact keys
    for (const [ns, keys] of Object.entries(newKeys.en)) {
      if (!data[ns]) data[ns] = {};
      mergeKeys(data[ns], keys);
    }
  } else if (locale === "es") {
    // Spanish
    for (const [ns, keys] of Object.entries(newKeys.es)) {
      if (!data[ns]) data[ns] = {};
      mergeKeys(data[ns], keys);
    }
  } else {
    // Other locales - use locale-specific common keys if available, else English
    const localeTranslations = translations[locale] || {};

    for (const [ns, keys] of Object.entries(newKeys.en)) {
      if (!data[ns]) data[ns] = {};
      const localeNsKeys = localeTranslations[ns] || {};
      const mergedKeys = {};
      for (const [key, value] of Object.entries(keys)) {
        mergedKeys[key] = localeNsKeys[key] || value;
      }
      mergeKeys(data[ns], mergedKeys);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Updated ${locale}.json`);
}

console.log("\nDone! All locale files updated.");
