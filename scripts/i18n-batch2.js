const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '..');

// Helper: apply string replacements to a file
function applyReplacements(relPath, changes) {
  const filePath = path.join(BASE, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  let applied = 0;
  for (const { from, to } of changes) {
    if (!content.includes(from)) {
      console.warn(`  SKIP in ${relPath}: "${from.substring(0, 50)}..."`);
      continue;
    }
    content = content.replace(from, to);
    applied++;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${relPath} (${applied}/${changes.length} replacements)`);
}

// ============================================================================
// 1. Shared Layout Components
// ============================================================================

// --- SearchModal.tsx ---
applyReplacements('src/components/layout/SearchModal.tsx', [
  { from: 'import { useRouter } from "next/navigation";', to: 'import { useRouter } from "next/navigation";\nimport { useTranslations } from "next-intl";' },
  { from: 'export function SearchModal({ open, onClose }: SearchModalProps) {\n  const router = useRouter();', to: 'export function SearchModal({ open, onClose }: SearchModalProps) {\n  const router = useRouter();\n  const t = useTranslations("topbar");' },
  { from: '            placeholder="Search pages, projects, invoices, contacts..."', to: '            placeholder={t("searchPlaceholder")}' },
  { from: '            <div className="search-modal-status">Searching...</div>', to: '            <div className="search-modal-status">{t("searching")}</div>' },
  { from: '            <div className="search-modal-status">\n              Type at least 2 characters to search\n            </div>', to: '            <div className="search-modal-status">\n              {t("typeToSearch")}\n            </div>' },
  { from: '          <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> Navigate</span>\n          <span><kbd>Enter</kbd> Open</span>\n          <span><kbd>Esc</kbd> Close</span>', to: '          <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> {t("navigate")}</span>\n          <span><kbd>Enter</kbd> {t("open")}</span>\n          <span><kbd>Esc</kbd> {t("close")}</span>' },
]);

// --- GracePeriodBanner.tsx ---
applyReplacements('src/components/layout/GracePeriodBanner.tsx', [
  { from: 'import { AlertTriangle, CreditCard } from "lucide-react";', to: 'import { AlertTriangle, CreditCard } from "lucide-react";\nimport { useTranslations } from "next-intl";' },
  { from: 'export function GracePeriodBanner() {\n  const router = useRouter();', to: 'export function GracePeriodBanner() {\n  const router = useRouter();\n  const t = useTranslations("common");' },
  { from: '              ? `Your subscription has expired. You have ${state.daysLeft} day${state.daysLeft !== 1 ? "s" : ""} of read-only access remaining.`\n              : "Your account is suspended. Please resubscribe to restore access."', to: '              ? t("gracePeriod.expired", { days: state.daysLeft })\n              : t("gracePeriod.suspended")' },
  { from: '              You can view all data and export reports, but cannot create or\n              edit records.', to: '              {t("gracePeriod.readOnlyDesc")}' },
  { from: '        <CreditCard size={14} />\n        Resubscribe Now', to: '        <CreditCard size={14} />\n        {t("gracePeriod.resubscribeNow")}' },
]);

// --- topbar.tsx ---
applyReplacements('src/components/layout/topbar.tsx', [
  { from: 'import { createClient } from "@/lib/supabase/client";', to: 'import { useTranslations } from "next-intl";\nimport { createClient } from "@/lib/supabase/client";' },
  { from: '  const { theme, variant, toggleTheme, setVariant } = useTheme();', to: '  const { theme, variant, toggleTheme, setVariant } = useTheme();\n  const t = useTranslations("topbar");' },
  { from: '              {resetting ? "Deleting..." : resetConfirm ? "Click to Confirm" : "Delete All Data"}', to: '              {resetting ? t("deleting") : resetConfirm ? t("clickToConfirm") : t("deleteAllData")}' },
  { from: '                ? "Trial expired"\n                : `${trialDaysLeft}d left in trial`', to: '                ? t("trialExpired")\n                : t("trialDaysLeft", { days: trialDaysLeft })' },
  { from: '                ? "Account suspended"\n                : `Read-only: ${graceDaysLeft}d left`', to: '                ? t("accountSuspended")\n                : t("readOnlyDaysLeft", { days: graceDaysLeft })' },
]);

// ============================================================================
// 2. Add translations to locale files
// ============================================================================

const MESSAGES_DIR = path.join(BASE, 'messages');
const LOCALES = ['en', 'es', 'pt-BR', 'fr', 'ar', 'de', 'hi', 'zh'];

// Topbar keys
const topbarKeys = {
  en: {
    "searchPlaceholder": "Search pages, projects, invoices, contacts...",
    "searching": "Searching...",
    "typeToSearch": "Type at least 2 characters to search",
    "navigate": "Navigate",
    "open": "Open",
    "close": "Close",
    "deleting": "Deleting...",
    "clickToConfirm": "Click to Confirm",
    "deleteAllData": "Delete All Data",
    "trialExpired": "Trial expired",
    "trialDaysLeft": "{days}d left in trial",
    "accountSuspended": "Account suspended",
    "readOnlyDaysLeft": "Read-only: {days}d left",
  },
  es: {
    "searchPlaceholder": "Buscar páginas, proyectos, facturas, contactos...",
    "searching": "Buscando...",
    "typeToSearch": "Escriba al menos 2 caracteres para buscar",
    "navigate": "Navegar",
    "open": "Abrir",
    "close": "Cerrar",
    "deleting": "Eliminando...",
    "clickToConfirm": "Haga clic para confirmar",
    "deleteAllData": "Eliminar Todos los Datos",
    "trialExpired": "Prueba expirada",
    "trialDaysLeft": "{days}d restantes en prueba",
    "accountSuspended": "Cuenta suspendida",
    "readOnlyDaysLeft": "Solo lectura: {days}d restantes",
  },
  "pt-BR": {
    "searchPlaceholder": "Buscar páginas, projetos, faturas, contatos...",
    "searching": "Buscando...",
    "typeToSearch": "Digite pelo menos 2 caracteres para buscar",
    "navigate": "Navegar",
    "open": "Abrir",
    "close": "Fechar",
    "deleting": "Excluindo...",
    "clickToConfirm": "Clique para confirmar",
    "deleteAllData": "Excluir Todos os Dados",
    "trialExpired": "Teste expirado",
    "trialDaysLeft": "{days}d restantes no teste",
    "accountSuspended": "Conta suspensa",
    "readOnlyDaysLeft": "Somente leitura: {days}d restantes",
  },
  fr: {
    "searchPlaceholder": "Rechercher pages, projets, factures, contacts...",
    "searching": "Recherche...",
    "typeToSearch": "Saisissez au moins 2 caractères pour rechercher",
    "navigate": "Naviguer",
    "open": "Ouvrir",
    "close": "Fermer",
    "deleting": "Suppression...",
    "clickToConfirm": "Cliquez pour confirmer",
    "deleteAllData": "Supprimer Toutes les Données",
    "trialExpired": "Essai expiré",
    "trialDaysLeft": "{days}j restants dans l'essai",
    "accountSuspended": "Compte suspendu",
    "readOnlyDaysLeft": "Lecture seule : {days}j restants",
  },
  ar: {
    "searchPlaceholder": "البحث في الصفحات والمشاريع والفواتير وجهات الاتصال...",
    "searching": "جاري البحث...",
    "typeToSearch": "اكتب حرفين على الأقل للبحث",
    "navigate": "التنقل",
    "open": "فتح",
    "close": "إغلاق",
    "deleting": "جاري الحذف...",
    "clickToConfirm": "انقر للتأكيد",
    "deleteAllData": "حذف جميع البيانات",
    "trialExpired": "انتهت الفترة التجريبية",
    "trialDaysLeft": "{days} يوم متبقي في الفترة التجريبية",
    "accountSuspended": "الحساب موقوف",
    "readOnlyDaysLeft": "للقراءة فقط: {days} يوم متبقي",
  },
  de: {
    "searchPlaceholder": "Seiten, Projekte, Rechnungen, Kontakte suchen...",
    "searching": "Suche...",
    "typeToSearch": "Geben Sie mindestens 2 Zeichen zum Suchen ein",
    "navigate": "Navigieren",
    "open": "Öffnen",
    "close": "Schließen",
    "deleting": "Wird gelöscht...",
    "clickToConfirm": "Zum Bestätigen klicken",
    "deleteAllData": "Alle Daten löschen",
    "trialExpired": "Testphase abgelaufen",
    "trialDaysLeft": "{days}T verbleibend im Test",
    "accountSuspended": "Konto gesperrt",
    "readOnlyDaysLeft": "Nur Lesen: {days}T verbleibend",
  },
  hi: {
    "searchPlaceholder": "पृष्ठ, परियोजनाएं, चालान, संपर्क खोजें...",
    "searching": "खोज रहा है...",
    "typeToSearch": "खोजने के लिए कम से कम 2 अक्षर लिखें",
    "navigate": "नेविगेट",
    "open": "खोलें",
    "close": "बंद करें",
    "deleting": "हटाया जा रहा है...",
    "clickToConfirm": "पुष्टि करने के लिए क्लिक करें",
    "deleteAllData": "सभी डेटा हटाएं",
    "trialExpired": "परीक्षण समाप्त",
    "trialDaysLeft": "परीक्षण में {days} दिन शेष",
    "accountSuspended": "खाता निलंबित",
    "readOnlyDaysLeft": "केवल पठन: {days} दिन शेष",
  },
  zh: {
    "searchPlaceholder": "搜索页面、项目、发票、联系人...",
    "searching": "搜索中...",
    "typeToSearch": "输入至少2个字符开始搜索",
    "navigate": "导航",
    "open": "打开",
    "close": "关闭",
    "deleting": "删除中...",
    "clickToConfirm": "点击确认",
    "deleteAllData": "删除所有数据",
    "trialExpired": "试用已过期",
    "trialDaysLeft": "试用还剩 {days} 天",
    "accountSuspended": "账户已暂停",
    "readOnlyDaysLeft": "只读模式：还剩 {days} 天",
  },
};

// Common keys (gracePeriod)
const commonKeys = {
  en: {
    "gracePeriod.expired": "Your subscription has expired. You have {days} day(s) of read-only access remaining.",
    "gracePeriod.suspended": "Your account is suspended. Please resubscribe to restore access.",
    "gracePeriod.readOnlyDesc": "You can view all data and export reports, but cannot create or edit records.",
    "gracePeriod.resubscribeNow": "Resubscribe Now",
  },
  es: {
    "gracePeriod.expired": "Su suscripción ha expirado. Le quedan {days} día(s) de acceso de solo lectura.",
    "gracePeriod.suspended": "Su cuenta está suspendida. Por favor suscríbase nuevamente para restaurar el acceso.",
    "gracePeriod.readOnlyDesc": "Puede ver todos los datos y exportar informes, pero no puede crear ni editar registros.",
    "gracePeriod.resubscribeNow": "Resubscribirse Ahora",
  },
  "pt-BR": {
    "gracePeriod.expired": "Sua assinatura expirou. Você tem {days} dia(s) de acesso somente leitura restantes.",
    "gracePeriod.suspended": "Sua conta está suspensa. Por favor, reassine para restaurar o acesso.",
    "gracePeriod.readOnlyDesc": "Você pode visualizar todos os dados e exportar relatórios, mas não pode criar ou editar registros.",
    "gracePeriod.resubscribeNow": "Reassinar Agora",
  },
  fr: {
    "gracePeriod.expired": "Votre abonnement a expiré. Il vous reste {days} jour(s) d'accès en lecture seule.",
    "gracePeriod.suspended": "Votre compte est suspendu. Veuillez vous réabonner pour restaurer l'accès.",
    "gracePeriod.readOnlyDesc": "Vous pouvez consulter toutes les données et exporter des rapports, mais vous ne pouvez pas créer ou modifier des enregistrements.",
    "gracePeriod.resubscribeNow": "Se Réabonner",
  },
  ar: {
    "gracePeriod.expired": "انتهى اشتراكك. لديك {days} يوم(أيام) من الوصول للقراءة فقط.",
    "gracePeriod.suspended": "حسابك موقوف. يرجى إعادة الاشتراك لاستعادة الوصول.",
    "gracePeriod.readOnlyDesc": "يمكنك عرض جميع البيانات وتصدير التقارير، لكن لا يمكنك إنشاء أو تعديل السجلات.",
    "gracePeriod.resubscribeNow": "إعادة الاشتراك الآن",
  },
  de: {
    "gracePeriod.expired": "Ihr Abonnement ist abgelaufen. Sie haben noch {days} Tag(e) Lesezugriff.",
    "gracePeriod.suspended": "Ihr Konto ist gesperrt. Bitte erneuern Sie Ihr Abonnement.",
    "gracePeriod.readOnlyDesc": "Sie können alle Daten einsehen und Berichte exportieren, aber keine Datensätze erstellen oder bearbeiten.",
    "gracePeriod.resubscribeNow": "Jetzt Erneuern",
  },
  hi: {
    "gracePeriod.expired": "आपकी सदस्यता समाप्त हो गई है। आपके पास {days} दिन का केवल पठन एक्सेस शेष है।",
    "gracePeriod.suspended": "आपका खाता निलंबित है। एक्सेस पुनर्स्थापित करने के लिए कृपया पुनः सदस्यता लें।",
    "gracePeriod.readOnlyDesc": "आप सभी डेटा देख सकते हैं और रिपोर्ट निर्यात कर सकते हैं, लेकिन रिकॉर्ड बना या संपादित नहीं कर सकते।",
    "gracePeriod.resubscribeNow": "अभी पुनः सदस्यता लें",
  },
  zh: {
    "gracePeriod.expired": "您的订阅已过期。您还有 {days} 天的只读访问权限。",
    "gracePeriod.suspended": "您的账户已暂停。请重新订阅以恢复访问。",
    "gracePeriod.readOnlyDesc": "您可以查看所有数据并导出报告，但无法创建或编辑记录。",
    "gracePeriod.resubscribeNow": "立即重新订阅",
  },
};

// Super Admin: featureFlags keys
const featureFlagsKeys = {
  en: {
    "featureFlags.title": "Feature Flags",
    "featureFlags.subtitle": "Manage feature flags to control feature availability across plans",
    "featureFlags.newFlag": "New Feature Flag",
    "featureFlags.totalFlags": "Total Flags",
    "featureFlags.enabled": "Enabled",
    "featureFlags.disabled": "Disabled",
    "featureFlags.searchPlaceholder": "Search flags by name...",
    "featureFlags.noMatchSearch": "No feature flags match your search.",
    "featureFlags.noFlagsYet": "No feature flags yet. Create your first one!",
    "featureFlags.description": "Description",
    "featureFlags.descriptionPlaceholder": "Describe what this feature flag controls...",
    "featureFlags.planRequirements": "Plan Requirements",
    "featureFlags.allPlansHint": "Leave all unchecked to make available to all plans.",
    "featureFlags.selectPlansHint": "Select which plans have access. Leave all unchecked to make available to all plans.",
    "featureFlags.saving": "Saving...",
    "featureFlags.saveChanges": "Save Changes",
    "featureFlags.deleting": "Deleting...",
    "featureFlags.delete": "Delete",
    "featureFlags.createDesc": "Create a new feature flag to control feature availability across different subscription plans.",
    "featureFlags.name": "Name",
    "featureFlags.creating": "Creating...",
    "featureFlags.createFlag": "Create Flag",
  },
  es: {
    "featureFlags.title": "Indicadores de Funciones",
    "featureFlags.subtitle": "Gestione indicadores para controlar la disponibilidad de funciones por plan",
    "featureFlags.newFlag": "Nuevo Indicador",
    "featureFlags.totalFlags": "Total de Indicadores",
    "featureFlags.enabled": "Activado",
    "featureFlags.disabled": "Desactivado",
    "featureFlags.searchPlaceholder": "Buscar indicadores por nombre...",
    "featureFlags.noMatchSearch": "Ningún indicador coincide con su búsqueda.",
    "featureFlags.noFlagsYet": "Aún no hay indicadores. ¡Cree el primero!",
    "featureFlags.description": "Descripción",
    "featureFlags.descriptionPlaceholder": "Describa qué controla este indicador...",
    "featureFlags.planRequirements": "Requisitos de Plan",
    "featureFlags.allPlansHint": "Deje todos sin marcar para disponibilidad en todos los planes.",
    "featureFlags.selectPlansHint": "Seleccione qué planes tienen acceso. Deje todos sin marcar para todos los planes.",
    "featureFlags.saving": "Guardando...",
    "featureFlags.saveChanges": "Guardar Cambios",
    "featureFlags.deleting": "Eliminando...",
    "featureFlags.delete": "Eliminar",
    "featureFlags.createDesc": "Cree un nuevo indicador para controlar la disponibilidad de funciones en diferentes planes.",
    "featureFlags.name": "Nombre",
    "featureFlags.creating": "Creando...",
    "featureFlags.createFlag": "Crear Indicador",
  },
  "pt-BR": {
    "featureFlags.title": "Flags de Funcionalidade",
    "featureFlags.subtitle": "Gerencie flags para controlar a disponibilidade de funcionalidades por plano",
    "featureFlags.newFlag": "Nova Flag",
    "featureFlags.totalFlags": "Total de Flags",
    "featureFlags.enabled": "Ativada",
    "featureFlags.disabled": "Desativada",
    "featureFlags.searchPlaceholder": "Buscar flags por nome...",
    "featureFlags.noMatchSearch": "Nenhuma flag corresponde à sua busca.",
    "featureFlags.noFlagsYet": "Nenhuma flag ainda. Crie a primeira!",
    "featureFlags.description": "Descrição",
    "featureFlags.descriptionPlaceholder": "Descreva o que esta flag controla...",
    "featureFlags.planRequirements": "Requisitos de Plano",
    "featureFlags.allPlansHint": "Deixe todos desmarcados para disponibilizar em todos os planos.",
    "featureFlags.selectPlansHint": "Selecione quais planos têm acesso. Deixe todos desmarcados para todos os planos.",
    "featureFlags.saving": "Salvando...",
    "featureFlags.saveChanges": "Salvar Alterações",
    "featureFlags.deleting": "Excluindo...",
    "featureFlags.delete": "Excluir",
    "featureFlags.createDesc": "Crie uma nova flag para controlar a disponibilidade de funcionalidades em diferentes planos.",
    "featureFlags.name": "Nome",
    "featureFlags.creating": "Criando...",
    "featureFlags.createFlag": "Criar Flag",
  },
  fr: {
    "featureFlags.title": "Drapeaux de Fonctionnalité",
    "featureFlags.subtitle": "Gérez les drapeaux pour contrôler la disponibilité des fonctionnalités par plan",
    "featureFlags.newFlag": "Nouveau Drapeau",
    "featureFlags.totalFlags": "Total des Drapeaux",
    "featureFlags.enabled": "Activé",
    "featureFlags.disabled": "Désactivé",
    "featureFlags.searchPlaceholder": "Rechercher des drapeaux par nom...",
    "featureFlags.noMatchSearch": "Aucun drapeau ne correspond à votre recherche.",
    "featureFlags.noFlagsYet": "Aucun drapeau pour le moment. Créez le premier !",
    "featureFlags.description": "Description",
    "featureFlags.descriptionPlaceholder": "Décrivez ce que ce drapeau contrôle...",
    "featureFlags.planRequirements": "Exigences de Plan",
    "featureFlags.allPlansHint": "Laissez tout décoché pour le rendre disponible à tous les plans.",
    "featureFlags.selectPlansHint": "Sélectionnez quels plans y ont accès. Laissez tout décoché pour tous les plans.",
    "featureFlags.saving": "Enregistrement...",
    "featureFlags.saveChanges": "Enregistrer",
    "featureFlags.deleting": "Suppression...",
    "featureFlags.delete": "Supprimer",
    "featureFlags.createDesc": "Créez un nouveau drapeau pour contrôler la disponibilité des fonctionnalités.",
    "featureFlags.name": "Nom",
    "featureFlags.creating": "Création...",
    "featureFlags.createFlag": "Créer le Drapeau",
  },
  ar: {
    "featureFlags.title": "علامات الميزات",
    "featureFlags.subtitle": "إدارة علامات الميزات للتحكم في توفر الميزات عبر الخطط",
    "featureFlags.newFlag": "علامة ميزة جديدة",
    "featureFlags.totalFlags": "إجمالي العلامات",
    "featureFlags.enabled": "مفعّل",
    "featureFlags.disabled": "معطّل",
    "featureFlags.searchPlaceholder": "البحث عن العلامات بالاسم...",
    "featureFlags.noMatchSearch": "لا توجد علامات تطابق بحثك.",
    "featureFlags.noFlagsYet": "لا توجد علامات بعد. أنشئ الأولى!",
    "featureFlags.description": "الوصف",
    "featureFlags.descriptionPlaceholder": "صف ما تتحكم فيه هذه العلامة...",
    "featureFlags.planRequirements": "متطلبات الخطة",
    "featureFlags.allPlansHint": "اترك الكل بدون تحديد للإتاحة لجميع الخطط.",
    "featureFlags.selectPlansHint": "حدد الخطط التي لها حق الوصول. اترك الكل بدون تحديد لجميع الخطط.",
    "featureFlags.saving": "جاري الحفظ...",
    "featureFlags.saveChanges": "حفظ التغييرات",
    "featureFlags.deleting": "جاري الحذف...",
    "featureFlags.delete": "حذف",
    "featureFlags.createDesc": "أنشئ علامة ميزة جديدة للتحكم في توفر الميزات عبر خطط الاشتراك المختلفة.",
    "featureFlags.name": "الاسم",
    "featureFlags.creating": "جاري الإنشاء...",
    "featureFlags.createFlag": "إنشاء العلامة",
  },
  de: {
    "featureFlags.title": "Feature-Flags",
    "featureFlags.subtitle": "Verwalten Sie Feature-Flags zur Steuerung der Funktionsverfügbarkeit",
    "featureFlags.newFlag": "Neues Feature-Flag",
    "featureFlags.totalFlags": "Gesamt-Flags",
    "featureFlags.enabled": "Aktiviert",
    "featureFlags.disabled": "Deaktiviert",
    "featureFlags.searchPlaceholder": "Flags nach Namen suchen...",
    "featureFlags.noMatchSearch": "Keine Feature-Flags entsprechen Ihrer Suche.",
    "featureFlags.noFlagsYet": "Noch keine Feature-Flags. Erstellen Sie das erste!",
    "featureFlags.description": "Beschreibung",
    "featureFlags.descriptionPlaceholder": "Beschreiben Sie, was dieses Feature-Flag steuert...",
    "featureFlags.planRequirements": "Plan-Anforderungen",
    "featureFlags.allPlansHint": "Alle deaktiviert lassen für Verfügbarkeit in allen Plänen.",
    "featureFlags.selectPlansHint": "Wählen Sie, welche Pläne Zugang haben. Alle deaktiviert lassen für alle Pläne.",
    "featureFlags.saving": "Wird gespeichert...",
    "featureFlags.saveChanges": "Änderungen speichern",
    "featureFlags.deleting": "Wird gelöscht...",
    "featureFlags.delete": "Löschen",
    "featureFlags.createDesc": "Erstellen Sie ein neues Feature-Flag zur Steuerung der Funktionsverfügbarkeit.",
    "featureFlags.name": "Name",
    "featureFlags.creating": "Wird erstellt...",
    "featureFlags.createFlag": "Flag erstellen",
  },
  hi: {
    "featureFlags.title": "फ़ीचर फ़्लैग",
    "featureFlags.subtitle": "योजनाओं में सुविधा उपलब्धता को नियंत्रित करने के लिए फ़ीचर फ़्लैग प्रबंधित करें",
    "featureFlags.newFlag": "नया फ़ीचर फ़्लैग",
    "featureFlags.totalFlags": "कुल फ़्लैग",
    "featureFlags.enabled": "सक्रिय",
    "featureFlags.disabled": "निष्क्रिय",
    "featureFlags.searchPlaceholder": "नाम से फ़्लैग खोजें...",
    "featureFlags.noMatchSearch": "आपकी खोज से कोई फ़्लैग मेल नहीं खाता।",
    "featureFlags.noFlagsYet": "अभी तक कोई फ़्लैग नहीं। पहला बनाएं!",
    "featureFlags.description": "विवरण",
    "featureFlags.descriptionPlaceholder": "वर्णन करें कि यह फ़्लैग क्या नियंत्रित करता है...",
    "featureFlags.planRequirements": "योजना आवश्यकताएं",
    "featureFlags.allPlansHint": "सभी योजनाओं के लिए उपलब्ध करने हेतु सभी अनचेक छोड़ दें।",
    "featureFlags.selectPlansHint": "चुनें कि किन योजनाओं की पहुंच है। सभी योजनाओं के लिए सभी अनचेक छोड़ दें।",
    "featureFlags.saving": "सहेजा जा रहा है...",
    "featureFlags.saveChanges": "परिवर्तन सहेजें",
    "featureFlags.deleting": "हटाया जा रहा है...",
    "featureFlags.delete": "हटाएं",
    "featureFlags.createDesc": "विभिन्न सदस्यता योजनाओं में सुविधा उपलब्धता को नियंत्रित करने के लिए एक नया फ़्लैग बनाएं।",
    "featureFlags.name": "नाम",
    "featureFlags.creating": "बनाया जा रहा है...",
    "featureFlags.createFlag": "फ़्लैग बनाएं",
  },
  zh: {
    "featureFlags.title": "功能开关",
    "featureFlags.subtitle": "管理功能开关以控制各计划的功能可用性",
    "featureFlags.newFlag": "新功能开关",
    "featureFlags.totalFlags": "总开关数",
    "featureFlags.enabled": "已启用",
    "featureFlags.disabled": "已禁用",
    "featureFlags.searchPlaceholder": "按名称搜索开关...",
    "featureFlags.noMatchSearch": "没有匹配您搜索的功能开关。",
    "featureFlags.noFlagsYet": "暂无功能开关。创建第一个吧！",
    "featureFlags.description": "描述",
    "featureFlags.descriptionPlaceholder": "描述此功能开关控制的内容...",
    "featureFlags.planRequirements": "计划要求",
    "featureFlags.allPlansHint": "全部不选以对所有计划可用。",
    "featureFlags.selectPlansHint": "选择哪些计划有权访问。全部不选则对所有计划可用。",
    "featureFlags.saving": "保存中...",
    "featureFlags.saveChanges": "保存更改",
    "featureFlags.deleting": "删除中...",
    "featureFlags.delete": "删除",
    "featureFlags.createDesc": "创建新的功能开关以控制不同订阅计划的功能可用性。",
    "featureFlags.name": "名称",
    "featureFlags.creating": "创建中...",
    "featureFlags.createFlag": "创建开关",
  },
};

// Apply to all locale files
for (const locale of LOCALES) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Add topbar keys
  if (!content.topbar) content.topbar = {};
  const tKeys = topbarKeys[locale] || topbarKeys.en;
  for (const [key, value] of Object.entries(tKeys)) {
    content.topbar[key] = value;
  }

  // Add common keys
  if (!content.common) content.common = {};
  const cKeys = commonKeys[locale] || commonKeys.en;
  for (const [key, value] of Object.entries(cKeys)) {
    content.common[key] = value;
  }

  // Add featureFlags keys to superAdmin
  if (!content.superAdmin) content.superAdmin = {};
  const ffKeys = featureFlagsKeys[locale] || featureFlagsKeys.en;
  for (const [key, value] of Object.entries(ffKeys)) {
    content.superAdmin[key] = value;
  }

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
  console.log(`Updated ${locale}.json`);
}

console.log('Done with batch 2!');
