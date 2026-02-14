/**
 * Internationalization (i18n) configuration for Buildwrk
 *
 * Provides a simple translation system that works with both
 * server and client components. Start with Mobile Portal (Spanish),
 * then expand to all portals.
 *
 * Usage:
 *   import { t, useLocale } from "@/lib/i18n";
 *   const label = t("common.save", locale);
 */

export type Locale = "en" | "es";

export const DEFAULT_LOCALE: Locale = "en";

export const SUPPORTED_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

// Translation dictionaries
const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.search": "Search",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.back": "Back",
    "common.next": "Next",
    "common.submit": "Submit",
    "common.close": "Close",
    "common.yes": "Yes",
    "common.no": "No",
    "common.all": "All",
    "common.none": "None",
    "common.export": "Export",
    "common.import": "Import",
    "common.filter": "Filter",

    // Mobile Portal
    "mobile.home": "Home",
    "mobile.clock": "Clock",
    "mobile.daily_log": "Daily Log",
    "mobile.photos": "Photos",
    "mobile.profile": "Profile",
    "mobile.clock_in": "Clock In",
    "mobile.clock_out": "Clock Out",
    "mobile.clocked_in": "Clocked In",
    "mobile.not_clocked_in": "Not Clocked In",
    "mobile.hours_today": "Hours Today",
    "mobile.take_photo": "Take Photo",
    "mobile.upload_photo": "Upload Photo",
    "mobile.add_caption": "Add caption...",
    "mobile.offline": "You are offline. Changes will sync when reconnected.",
    "mobile.back_online": "Back online",

    // Daily Logs
    "daily_log.title": "Daily Logs",
    "daily_log.new": "New Daily Log",
    "daily_log.date": "Log Date",
    "daily_log.weather": "Weather",
    "daily_log.temperature": "Temperature",
    "daily_log.work_performed": "Work Performed",
    "daily_log.safety_incidents": "Safety Incidents",
    "daily_log.delays": "Delays",
    "daily_log.status_draft": "Draft",
    "daily_log.status_submitted": "Submitted",
    "daily_log.status_approved": "Approved",
    "daily_log.auto_fill_weather": "Auto-Fill Weather",

    // Projects
    "project.projects": "Projects",
    "project.active": "Active Projects",
    "project.new": "New Project",
    "project.budget": "Budget",
    "project.schedule": "Schedule",
    "project.status": "Status",

    // Financial
    "financial.invoices": "Invoices",
    "financial.payments": "Payments",
    "financial.balance": "Balance",
    "financial.revenue": "Revenue",
    "financial.expenses": "Expenses",

    // Auth
    "auth.login": "Log In",
    "auth.logout": "Log Out",
    "auth.register": "Register",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.forgot_password": "Forgot Password?",
  },
  es: {
    // Common
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.create": "Crear",
    "common.search": "Buscar",
    "common.loading": "Cargando...",
    "common.error": "Error",
    "common.success": "Éxito",
    "common.back": "Atrás",
    "common.next": "Siguiente",
    "common.submit": "Enviar",
    "common.close": "Cerrar",
    "common.yes": "Sí",
    "common.no": "No",
    "common.all": "Todos",
    "common.none": "Ninguno",
    "common.export": "Exportar",
    "common.import": "Importar",
    "common.filter": "Filtrar",

    // Mobile Portal
    "mobile.home": "Inicio",
    "mobile.clock": "Reloj",
    "mobile.daily_log": "Registro Diario",
    "mobile.photos": "Fotos",
    "mobile.profile": "Perfil",
    "mobile.clock_in": "Registrar Entrada",
    "mobile.clock_out": "Registrar Salida",
    "mobile.clocked_in": "Registrado",
    "mobile.not_clocked_in": "No Registrado",
    "mobile.hours_today": "Horas Hoy",
    "mobile.take_photo": "Tomar Foto",
    "mobile.upload_photo": "Subir Foto",
    "mobile.add_caption": "Agregar descripción...",
    "mobile.offline": "Estás sin conexión. Los cambios se sincronizarán al reconectarse.",
    "mobile.back_online": "De vuelta en línea",

    // Daily Logs
    "daily_log.title": "Registros Diarios",
    "daily_log.new": "Nuevo Registro Diario",
    "daily_log.date": "Fecha del Registro",
    "daily_log.weather": "Clima",
    "daily_log.temperature": "Temperatura",
    "daily_log.work_performed": "Trabajo Realizado",
    "daily_log.safety_incidents": "Incidentes de Seguridad",
    "daily_log.delays": "Retrasos",
    "daily_log.status_draft": "Borrador",
    "daily_log.status_submitted": "Enviado",
    "daily_log.status_approved": "Aprobado",
    "daily_log.auto_fill_weather": "Auto-Llenar Clima",

    // Projects
    "project.projects": "Proyectos",
    "project.active": "Proyectos Activos",
    "project.new": "Nuevo Proyecto",
    "project.budget": "Presupuesto",
    "project.schedule": "Cronograma",
    "project.status": "Estado",

    // Financial
    "financial.invoices": "Facturas",
    "financial.payments": "Pagos",
    "financial.balance": "Saldo",
    "financial.revenue": "Ingresos",
    "financial.expenses": "Gastos",

    // Auth
    "auth.login": "Iniciar Sesión",
    "auth.logout": "Cerrar Sesión",
    "auth.register": "Registrarse",
    "auth.email": "Correo Electrónico",
    "auth.password": "Contraseña",
    "auth.forgot_password": "¿Olvidaste tu Contraseña?",
  },
};

/**
 * Translate a key to the given locale
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return translations[locale]?.[key] || translations.en[key] || key;
}

/**
 * Get the user's preferred locale from cookies/browser
 */
export function getLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(/locale=([^;]+)/);
  if (match && (match[1] === "en" || match[1] === "es")) {
    return match[1] as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Set the locale in a cookie
 */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `locale=${locale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
}
