#!/usr/bin/env node
/**
 * Add i18n translation keys for all 16 untranslated pages across all 8 locales.
 * Covers: Properties, Reports, Safety/Equipment/People overviews, Financial overview, Gantt
 */

const fs = require("fs");
const path = require("path");

const messagesDir = path.join(__dirname, "..", "messages");
const locales = ["en", "es", "pt-BR", "fr", "ar", "de", "hi", "zh"];

// ─── TRANSLATIONS ───────────────────────────────────────────────

const newKeys = {
  // ═══ PROPERTIES NAMESPACE ═══
  properties: {
    // --- properties/page.tsx (list page) ---
    "listTitle": {
      en: "Properties", es: "Propiedades", "pt-BR": "Propriedades", fr: "Propriétés",
      ar: "العقارات", de: "Immobilien", hi: "संपत्तियां", zh: "物业"
    },
    "listSubtitle": {
      en: "Manage your real estate portfolio", es: "Administre su portafolio inmobiliario",
      "pt-BR": "Gerencie seu portfólio imobiliário", fr: "Gérez votre portefeuille immobilier",
      ar: "إدارة محفظتك العقارية", de: "Verwalten Sie Ihr Immobilienportfolio",
      hi: "अपने रियल एस्टेट पोर्टफोलियो का प्रबंधन करें", zh: "管理您的房地产投资组合"
    },
    "addProperty": {
      en: "Add Property", es: "Agregar Propiedad", "pt-BR": "Adicionar Propriedade",
      fr: "Ajouter une Propriété", ar: "إضافة عقار", de: "Immobilie hinzufügen",
      hi: "संपत्ति जोड़ें", zh: "添加物业"
    },
    "totalProperties": {
      en: "Total Properties", es: "Total de Propiedades", "pt-BR": "Total de Propriedades",
      fr: "Total des Propriétés", ar: "إجمالي العقارات", de: "Immobilien gesamt",
      hi: "कुल संपत्तियां", zh: "物业总数"
    },
    "totalUnits": {
      en: "Total Units", es: "Total de Unidades", "pt-BR": "Total de Unidades",
      fr: "Total des Unités", ar: "إجمالي الوحدات", de: "Einheiten gesamt",
      hi: "कुल इकाइयां", zh: "单元总数"
    },
    "occupied": {
      en: "occupied", es: "ocupadas", "pt-BR": "ocupadas", fr: "occupées",
      ar: "مشغولة", de: "belegt", hi: "अधिकृत", zh: "已入住"
    },
    "avgOccupancy": {
      en: "Average Occupancy", es: "Ocupación Promedio", "pt-BR": "Ocupação Média",
      fr: "Occupation Moyenne", ar: "متوسط الإشغال", de: "Durchschnittliche Belegung",
      hi: "औसत अधिभोग", zh: "平均入住率"
    },
    "totalMonthlyNOI": {
      en: "Total Monthly NOI", es: "NOI Mensual Total", "pt-BR": "NOI Mensal Total",
      fr: "NOI Mensuel Total", ar: "صافي الدخل التشغيلي الشهري", de: "Monatliches NOI gesamt",
      hi: "कुल मासिक NOI", zh: "月度NOI总计"
    },
    "noPropertiesYet": {
      en: "No properties yet", es: "Aún no hay propiedades", "pt-BR": "Nenhuma propriedade ainda",
      fr: "Aucune propriété pour le moment", ar: "لا توجد عقارات بعد", de: "Noch keine Immobilien",
      hi: "अभी कोई संपत्ति नहीं", zh: "暂无物业"
    },
    "addFirstProperty": {
      en: "Add your first property to start managing your real estate portfolio.",
      es: "Agregue su primera propiedad para comenzar a administrar su portafolio inmobiliario.",
      "pt-BR": "Adicione sua primeira propriedade para começar a gerenciar seu portfólio imobiliário.",
      fr: "Ajoutez votre première propriété pour commencer à gérer votre portefeuille immobilier.",
      ar: "أضف عقارك الأول لبدء إدارة محفظتك العقارية.",
      de: "Fügen Sie Ihre erste Immobilie hinzu, um Ihr Portfolio zu verwalten.",
      hi: "अपना रियल एस्टेट पोर्टफोलियो प्रबंधित करना शुरू करने के लिए अपनी पहली संपत्ति जोड़ें।",
      zh: "添加您的第一个物业以开始管理您的房地产投资组合。"
    },
    "units": {
      en: "Units", es: "Unidades", "pt-BR": "Unidades", fr: "Unités",
      ar: "الوحدات", de: "Einheiten", hi: "इकाइयां", zh: "单元"
    },
    "monthlyNOI": {
      en: "Monthly NOI", es: "NOI Mensual", "pt-BR": "NOI Mensal",
      fr: "NOI Mensuel", ar: "صافي الدخل التشغيلي الشهري", de: "Monatliches NOI",
      hi: "मासिक NOI", zh: "月度NOI"
    },
    "occupancy": {
      en: "Occupancy", es: "Ocupación", "pt-BR": "Ocupação", fr: "Occupation",
      ar: "الإشغال", de: "Belegung", hi: "अधिभोग", zh: "入住率"
    },
    "openMaint": {
      en: "open", es: "abiertas", "pt-BR": "abertas", fr: "ouvertes",
      ar: "مفتوحة", de: "offen", hi: "खुली", zh: "未处理"
    },
    "notAuthorized": {
      en: "Not Authorized", es: "No Autorizado", "pt-BR": "Não Autorizado",
      fr: "Non Autorisé", ar: "غير مصرح", de: "Nicht autorisiert",
      hi: "अनधिकृत", zh: "未授权"
    },
    "loginToViewProperties": {
      en: "Please log in and join a company to view properties.",
      es: "Inicie sesión y únase a una empresa para ver las propiedades.",
      "pt-BR": "Faça login e entre em uma empresa para ver as propriedades.",
      fr: "Veuillez vous connecter et rejoindre une entreprise pour voir les propriétés.",
      ar: "يرجى تسجيل الدخول والانضمام إلى شركة لعرض العقارات.",
      de: "Bitte melden Sie sich an und treten Sie einem Unternehmen bei, um Immobilien anzuzeigen.",
      hi: "संपत्तियां देखने के लिए कृपया लॉग इन करें और किसी कंपनी में शामिल हों।",
      zh: "请登录并加入公司以查看物业。"
    },
    "residential": {
      en: "Residential", es: "Residencial", "pt-BR": "Residencial", fr: "Résidentiel",
      ar: "سكني", de: "Wohnimmobilie", hi: "आवासीय", zh: "住宅"
    },
    "commercial": {
      en: "Commercial", es: "Comercial", "pt-BR": "Comercial", fr: "Commercial",
      ar: "تجاري", de: "Gewerbeimmobilie", hi: "वाणिज्यिक", zh: "商业"
    },
    "industrial": {
      en: "Industrial", es: "Industrial", "pt-BR": "Industrial", fr: "Industriel",
      ar: "صناعي", de: "Industrieimmobilie", hi: "औद्योगिक", zh: "工业"
    },
    "mixedUse": {
      en: "Mixed Use", es: "Uso Mixto", "pt-BR": "Uso Misto", fr: "Usage Mixte",
      ar: "متعدد الاستخدامات", de: "Gemischtnutzung", hi: "मिश्रित उपयोग", zh: "综合用途"
    },
    // --- properties/overview/page.tsx ---
    "overviewTitle": {
      en: "Properties Overview", es: "Resumen de Propiedades", "pt-BR": "Visão Geral das Propriedades",
      fr: "Aperçu des Propriétés", ar: "نظرة عامة على العقارات", de: "Immobilienübersicht",
      hi: "संपत्तियों का अवलोकन", zh: "物业概览"
    },
    "overviewSubtitle": {
      en: "Portfolio performance, occupancy, and maintenance at a glance.",
      es: "Rendimiento del portafolio, ocupación y mantenimiento de un vistazo.",
      "pt-BR": "Desempenho do portfólio, ocupação e manutenção em um relance.",
      fr: "Performance du portefeuille, occupation et maintenance en un coup d'œil.",
      ar: "أداء المحفظة والإشغال والصيانة في لمحة.",
      de: "Portfolioleistung, Belegung und Wartung auf einen Blick.",
      hi: "पोर्टफोलियो प्रदर्शन, अधिभोग और रखरखाव एक नज़र में।",
      zh: "投资组合绩效、入住率和维护一目了然。"
    },
    "allProperties": {
      en: "All Properties", es: "Todas las Propiedades", "pt-BR": "Todas as Propriedades",
      fr: "Toutes les Propriétés", ar: "جميع العقارات", de: "Alle Immobilien",
      hi: "सभी संपत्तियां", zh: "所有物业"
    },
    "monthlyRevenue": {
      en: "Monthly Revenue", es: "Ingresos Mensuales", "pt-BR": "Receita Mensal",
      fr: "Revenu Mensuel", ar: "الإيرادات الشهرية", de: "Monatlicher Umsatz",
      hi: "मासिक राजस्व", zh: "月收入"
    },
    "openMaintenance": {
      en: "Open Maintenance", es: "Mantenimiento Abierto", "pt-BR": "Manutenção Aberta",
      fr: "Maintenance Ouverte", ar: "صيانة مفتوحة", de: "Offene Wartung",
      hi: "खुला रखरखाव", zh: "待处理维护"
    },
    "occupancyByProperty": {
      en: "Occupancy by Property", es: "Ocupación por Propiedad", "pt-BR": "Ocupação por Propriedade",
      fr: "Occupation par Propriété", ar: "الإشغال حسب العقار", de: "Belegung nach Immobilie",
      hi: "संपत्ति के अनुसार अधिभोग", zh: "按物业入住率"
    },
    "revenueByPropertyType": {
      en: "Revenue by Property Type", es: "Ingresos por Tipo de Propiedad",
      "pt-BR": "Receita por Tipo de Propriedade", fr: "Revenu par Type de Propriété",
      ar: "الإيرادات حسب نوع العقار", de: "Umsatz nach Immobilientyp",
      hi: "संपत्ति प्रकार के अनुसार राजस्व", zh: "按物业类型收入"
    },
    "expiringLeases": {
      en: "Expiring Leases (60 Days)", es: "Arrendamientos por Vencer (60 Días)",
      "pt-BR": "Contratos Expirando (60 Dias)", fr: "Baux Expirant (60 Jours)",
      ar: "عقود الإيجار المنتهية (60 يومًا)", de: "Auslaufende Mietverträge (60 Tage)",
      hi: "समाप्त होने वाले पट्टे (60 दिन)", zh: "即将到期租约（60天）"
    },
    "noLeasesExpiring": {
      en: "No leases expiring soon", es: "No hay arrendamientos por vencer pronto",
      "pt-BR": "Nenhum contrato expirando em breve", fr: "Aucun bail expirant bientôt",
      ar: "لا توجد عقود إيجار تنتهي قريبًا", de: "Keine Mietverträge laufen bald aus",
      hi: "जल्द ही कोई पट्टा समाप्त नहीं हो रहा", zh: "近期无到期租约"
    },
    "openMaintenanceRequests": {
      en: "Open Maintenance Requests", es: "Solicitudes de Mantenimiento Abiertas",
      "pt-BR": "Solicitações de Manutenção Abertas", fr: "Demandes de Maintenance Ouvertes",
      ar: "طلبات الصيانة المفتوحة", de: "Offene Wartungsanfragen",
      hi: "खुले रखरखाव अनुरोध", zh: "待处理维护请求"
    },
    "noOpenMaintenanceRequests": {
      en: "No open maintenance requests", es: "No hay solicitudes de mantenimiento abiertas",
      "pt-BR": "Nenhuma solicitação de manutenção aberta", fr: "Aucune demande de maintenance ouverte",
      ar: "لا توجد طلبات صيانة مفتوحة", de: "Keine offenen Wartungsanfragen",
      hi: "कोई खुले रखरखाव अनुरोध नहीं", zh: "无待处理维护请求"
    },
    "allLeases": {
      en: "All Leases", es: "Todos los Arrendamientos", "pt-BR": "Todos os Contratos",
      fr: "Tous les Baux", ar: "جميع عقود الإيجار", de: "Alle Mietverträge",
      hi: "सभी पट्टे", zh: "所有租约"
    },
    "allMaintenance": {
      en: "All Maintenance", es: "Todo el Mantenimiento", "pt-BR": "Toda a Manutenção",
      fr: "Toute la Maintenance", ar: "جميع الصيانة", de: "Alle Wartungen",
      hi: "सभी रखरखाव", zh: "所有维护"
    },
    "loginToViewOverview": {
      en: "Please log in and join a company to view the properties overview.",
      es: "Inicie sesión y únase a una empresa para ver el resumen de propiedades.",
      "pt-BR": "Faça login e entre em uma empresa para ver a visão geral das propriedades.",
      fr: "Veuillez vous connecter et rejoindre une entreprise pour voir l'aperçu des propriétés.",
      ar: "يرجى تسجيل الدخول والانضمام إلى شركة لعرض نظرة عامة على العقارات.",
      de: "Bitte melden Sie sich an und treten Sie einem Unternehmen bei, um die Immobilienübersicht anzuzeigen.",
      hi: "संपत्तियों का अवलोकन देखने के लिए कृपया लॉग इन करें और किसी कंपनी में शामिल हों।",
      zh: "请登录并加入公司以查看物业概览。"
    },
    "thProperty": {
      en: "Property", es: "Propiedad", "pt-BR": "Propriedade", fr: "Propriété",
      ar: "العقار", de: "Immobilie", hi: "संपत्ति", zh: "物业"
    },
    "thUnit": {
      en: "Unit", es: "Unidad", "pt-BR": "Unidade", fr: "Unité",
      ar: "الوحدة", de: "Einheit", hi: "इकाई", zh: "单元"
    },
    "thTenant": {
      en: "Tenant", es: "Inquilino", "pt-BR": "Inquilino", fr: "Locataire",
      ar: "المستأجر", de: "Mieter", hi: "किरायेदार", zh: "租户"
    },
    "thLeaseEnd": {
      en: "Lease End", es: "Fin del Arrendamiento", "pt-BR": "Fim do Contrato",
      fr: "Fin du Bail", ar: "نهاية الإيجار", de: "Mietende",
      hi: "पट्टा समाप्ति", zh: "租约到期"
    },
    "thRent": {
      en: "Rent", es: "Renta", "pt-BR": "Aluguel", fr: "Loyer",
      ar: "الإيجار", de: "Miete", hi: "किराया", zh: "租金"
    },
    "thTitle": {
      en: "Title", es: "Título", "pt-BR": "Título", fr: "Titre",
      ar: "العنوان", de: "Titel", hi: "शीर्षक", zh: "标题"
    },
    "thPriority": {
      en: "Priority", es: "Prioridad", "pt-BR": "Prioridade", fr: "Priorité",
      ar: "الأولوية", de: "Priorität", hi: "प्राथमिकता", zh: "优先级"
    },
    "thStatus": {
      en: "Status", es: "Estado", "pt-BR": "Status", fr: "Statut",
      ar: "الحالة", de: "Status", hi: "स्थिति", zh: "状态"
    },
    // --- properties/transactions/page.tsx ---
    "transactionsTitle": {
      en: "Properties Transactions", es: "Transacciones de Propiedades",
      "pt-BR": "Transações de Propriedades", fr: "Transactions de Propriétés",
      ar: "معاملات العقارات", de: "Immobilientransaktionen",
      hi: "संपत्ति लेनदेन", zh: "物业交易"
    },
    "transactionsSubtitle": {
      en: "Financial transactions linked to properties — invoices, lease payments, and journal entries.",
      es: "Transacciones financieras vinculadas a propiedades — facturas, pagos de arrendamiento y asientos contables.",
      "pt-BR": "Transações financeiras vinculadas a propriedades — faturas, pagamentos de aluguel e lançamentos contábeis.",
      fr: "Transactions financières liées aux propriétés — factures, paiements de bail et écritures comptables.",
      ar: "المعاملات المالية المرتبطة بالعقارات — الفواتير ودفعات الإيجار والقيود المحاسبية.",
      de: "Finanztransaktionen im Zusammenhang mit Immobilien — Rechnungen, Mietzahlungen und Buchungen.",
      hi: "संपत्तियों से जुड़े वित्तीय लेनदेन — चालान, पट्टा भुगतान और जर्नल प्रविष्टियां।",
      zh: "与物业相关的财务交易——发票、租赁付款和日记账分录。"
    },
    // --- properties/new/page.tsx ---
    "backToProperties": {
      en: "Back to Properties", es: "Volver a Propiedades", "pt-BR": "Voltar para Propriedades",
      fr: "Retour aux Propriétés", ar: "العودة إلى العقارات", de: "Zurück zu Immobilien",
      hi: "संपत्तियों पर वापस जाएं", zh: "返回物业"
    },
    "createNewProperty": {
      en: "Create a new property in your portfolio", es: "Crear una nueva propiedad en su portafolio",
      "pt-BR": "Criar uma nova propriedade em seu portfólio", fr: "Créer une nouvelle propriété dans votre portefeuille",
      ar: "إنشاء عقار جديد في محفظتك", de: "Eine neue Immobilie in Ihrem Portfolio erstellen",
      hi: "अपने पोर्टफोलियो में एक नई संपत्ति बनाएं", zh: "在您的投资组合中创建新物业"
    },
    "propertyName": {
      en: "Property Name", es: "Nombre de la Propiedad", "pt-BR": "Nome da Propriedade",
      fr: "Nom de la Propriété", ar: "اسم العقار", de: "Immobilienname",
      hi: "संपत्ति का नाम", zh: "物业名称"
    },
    "propertyType": {
      en: "Property Type", es: "Tipo de Propiedad", "pt-BR": "Tipo de Propriedade",
      fr: "Type de Propriété", ar: "نوع العقار", de: "Immobilientyp",
      hi: "संपत्ति प्रकार", zh: "物业类型"
    },
    "yearBuilt": {
      en: "Year Built", es: "Año de Construcción", "pt-BR": "Ano de Construção",
      fr: "Année de Construction", ar: "سنة البناء", de: "Baujahr",
      hi: "निर्माण वर्ष", zh: "建造年份"
    },
    "address": {
      en: "Address", es: "Dirección", "pt-BR": "Endereço", fr: "Adresse",
      ar: "العنوان", de: "Adresse", hi: "पता", zh: "地址"
    },
    "streetAddress": {
      en: "Street address", es: "Dirección de la calle", "pt-BR": "Endereço",
      fr: "Adresse de la rue", ar: "عنوان الشارع", de: "Straßenadresse",
      hi: "सड़क का पता", zh: "街道地址"
    },
    "city": {
      en: "City", es: "Ciudad", "pt-BR": "Cidade", fr: "Ville",
      ar: "المدينة", de: "Stadt", hi: "शहर", zh: "城市"
    },
    "state": {
      en: "State", es: "Estado", "pt-BR": "Estado", fr: "État",
      ar: "الولاية", de: "Bundesland", hi: "राज्य", zh: "州"
    },
    "zipCode": {
      en: "ZIP Code", es: "Código Postal", "pt-BR": "CEP", fr: "Code Postal",
      ar: "الرمز البريدي", de: "Postleitzahl", hi: "पिन कोड", zh: "邮政编码"
    },
    "totalSqFt": {
      en: "Total Sq Ft", es: "Pies Cuadrados Totales", "pt-BR": "Área Total (m²)",
      fr: "Surface Totale (m²)", ar: "إجمالي المساحة", de: "Gesamtfläche (m²)",
      hi: "कुल वर्ग फीट", zh: "总面积（平方英尺）"
    },
    "purchasePrice": {
      en: "Purchase Price ($)", es: "Precio de Compra ($)", "pt-BR": "Preço de Compra ($)",
      fr: "Prix d'Achat ($)", ar: "سعر الشراء ($)", de: "Kaufpreis ($)",
      hi: "खरीद मूल्य ($)", zh: "购买价格 ($)"
    },
    "currentValue": {
      en: "Current Value ($)", es: "Valor Actual ($)", "pt-BR": "Valor Atual ($)",
      fr: "Valeur Actuelle ($)", ar: "القيمة الحالية ($)", de: "Aktueller Wert ($)",
      hi: "वर्तमान मूल्य ($)", zh: "当前价值 ($)"
    },
    "saving": {
      en: "Saving...", es: "Guardando...", "pt-BR": "Salvando...", fr: "Enregistrement...",
      ar: "جارٍ الحفظ...", de: "Speichern...", hi: "सहेज रहा है...", zh: "保存中..."
    },
    "createProperty": {
      en: "Create Property", es: "Crear Propiedad", "pt-BR": "Criar Propriedade",
      fr: "Créer la Propriété", ar: "إنشاء عقار", de: "Immobilie erstellen",
      hi: "संपत्ति बनाएं", zh: "创建物业"
    },
    "cancel": {
      en: "Cancel", es: "Cancelar", "pt-BR": "Cancelar", fr: "Annuler",
      ar: "إلغاء", de: "Abbrechen", hi: "रद्द करें", zh: "取消"
    },
    "nameRequired": {
      en: "Property name is required.", es: "El nombre de la propiedad es obligatorio.",
      "pt-BR": "O nome da propriedade é obrigatório.", fr: "Le nom de la propriété est requis.",
      ar: "اسم العقار مطلوب.", de: "Der Immobilienname ist erforderlich.",
      hi: "संपत्ति का नाम आवश्यक है।", zh: "物业名称为必填项。"
    },
    "addressRequired": {
      en: "Address is required.", es: "La dirección es obligatoria.",
      "pt-BR": "O endereço é obrigatório.", fr: "L'adresse est requise.",
      ar: "العنوان مطلوب.", de: "Die Adresse ist erforderlich.",
      hi: "पता आवश्यक है।", zh: "地址为必填项。"
    },
    "cityStateZipRequired": {
      en: "City, state, and ZIP are required.", es: "Ciudad, estado y código postal son obligatorios.",
      "pt-BR": "Cidade, estado e CEP são obrigatórios.", fr: "Ville, état et code postal sont requis.",
      ar: "المدينة والولاية والرمز البريدي مطلوبة.", de: "Stadt, Bundesland und PLZ sind erforderlich.",
      hi: "शहर, राज्य और पिन कोड आवश्यक हैं।", zh: "城市、州和邮编为必填项。"
    },
  },
};

// ─── APPLY TO LOCALE FILES ─────────────────────────────────

for (const locale of locales) {
  const filePath = path.join(messagesDir, locale + ".json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  let addedCount = 0;

  for (const [namespace, keys] of Object.entries(newKeys)) {
    if (!data[namespace]) {
      data[namespace] = {};
    }

    for (const [key, translations] of Object.entries(keys)) {
      const value = translations[locale] || translations["en"]; // Fallback to English
      if (!(key in data[namespace])) {
        data[namespace][key] = value;
        addedCount++;
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`${locale}: added ${addedCount} keys`);
}

console.log("\nDone. Properties translations added to all locales.");
