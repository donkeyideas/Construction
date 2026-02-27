#!/usr/bin/env node
/**
 * Add 9 missing superAdmin GEO keys to pt-BR, fr, ar, de, hi, zh.
 * These keys exist in en/es but are missing from the other 6 locales.
 */

const fs = require("fs");
const path = require("path");

const translations = {
  "pt-BR": {
    geoNoData: "Nenhuma página publicada para analisar.",
    geoNoDataDesc: "Publique páginas CMS para ver a pontuação de Otimização para Motores Generativos em 6 dimensões de citabilidade por IA.",
    geoOverallScore: "Pontuação GEO",
    geoRadarTitle: "Radar de Citabilidade IA",
    geoPageScores: "Pontuações GEO das Páginas",
    geoScore: "Pontuação",
    geoScoreExcellent: "Excelente citabilidade. O conteúdo é altamente citável por motores de IA generativa.",
    geoScoreGood: "Boa base. Melhore os pontos de dados e a clareza semântica para melhores citações por IA.",
    geoScorePoor: "Precisa melhorar. Adicione dados factuais, estatísticas e conteúdo estruturado para citabilidade por IA.",
  },
  fr: {
    geoNoData: "Aucune page publiée à analyser.",
    geoNoDataDesc: "Publiez des pages CMS pour voir le score d'Optimisation pour Moteurs Génératifs sur 6 dimensions de citabilité IA.",
    geoOverallScore: "Score GEO",
    geoRadarTitle: "Radar de Citabilité IA",
    geoPageScores: "Scores GEO des Pages",
    geoScore: "Score",
    geoScoreExcellent: "Excellente citabilité. Le contenu est hautement citable par les moteurs d'IA générative.",
    geoScoreGood: "Bonne base. Améliorez les données et la clarté sémantique pour de meilleures citations IA.",
    geoScorePoor: "À améliorer. Ajoutez des données factuelles, des statistiques et du contenu structuré pour la citabilité IA.",
  },
  ar: {
    geoNoData: "لا توجد صفحات منشورة للتحليل.",
    geoNoDataDesc: "انشر صفحات CMS لرؤية تقييم تحسين محركات الذكاء الاصطناعي التوليدي عبر 6 أبعاد للاستشهاد.",
    geoOverallScore: "نقاط GEO",
    geoRadarTitle: "رادار الاستشهاد بالذكاء الاصطناعي",
    geoPageScores: "نقاط GEO للصفحات",
    geoScore: "النقاط",
    geoScoreExcellent: "قابلية استشهاد ممتازة. المحتوى قابل للاقتباس بشكل كبير من محركات الذكاء الاصطناعي التوليدي.",
    geoScoreGood: "أساس جيد. حسّن نقاط البيانات والوضوح الدلالي لاستشهادات أفضل بالذكاء الاصطناعي.",
    geoScorePoor: "يحتاج إلى تحسين. أضف بيانات واقعية وإحصائيات ومحتوى منظم لقابلية الاستشهاد بالذكاء الاصطناعي.",
  },
  de: {
    geoNoData: "Keine veröffentlichten Seiten zur Analyse.",
    geoNoDataDesc: "Veröffentlichen Sie CMS-Seiten, um die Bewertung der generativen Suchmaschinenoptimierung in 6 KI-Zitierbarkeitsdimensionen zu sehen.",
    geoOverallScore: "GEO-Bewertung",
    geoRadarTitle: "KI-Zitierbarkeitsradar",
    geoPageScores: "Seiten-GEO-Bewertungen",
    geoScore: "Bewertung",
    geoScoreExcellent: "Hervorragende Zitierbarkeit. Der Inhalt ist von generativen KI-Engines hoch zitierbar.",
    geoScoreGood: "Gute Grundlage. Verbessern Sie Datenpunkte und semantische Klarheit für bessere KI-Zitate.",
    geoScorePoor: "Verbesserungsbedarf. Fügen Sie Fakten, Statistiken und strukturierte Inhalte für KI-Zitierbarkeit hinzu.",
  },
  hi: {
    geoNoData: "विश्लेषण के लिए कोई प्रकाशित पृष्ठ नहीं।",
    geoNoDataDesc: "6 AI उद्धरणीयता आयामों में जनरेटिव इंजन ऑप्टिमाइज़ेशन स्कोरिंग देखने के लिए CMS पृष्ठ प्रकाशित करें।",
    geoOverallScore: "GEO स्कोर",
    geoRadarTitle: "AI उद्धरणीयता रडार",
    geoPageScores: "पृष्ठ GEO स्कोर",
    geoScore: "स्कोर",
    geoScoreExcellent: "उत्कृष्ट उद्धरणीयता। सामग्री जनरेटिव AI इंजनों द्वारा अत्यधिक उद्धृत करने योग्य है।",
    geoScoreGood: "अच्छी नींव। बेहतर AI उद्धरण के लिए डेटा बिंदुओं और अर्थपूर्ण स्पष्टता में सुधार करें।",
    geoScorePoor: "सुधार की आवश्यकता है। AI उद्धरणीयता के लिए तथ्यात्मक डेटा, आँकड़े और संरचित सामग्री जोड़ें।",
  },
  zh: {
    geoNoData: "没有已发布的页面可供分析。",
    geoNoDataDesc: "发布CMS页面以查看6个AI可引用性维度的生成引擎优化评分。",
    geoOverallScore: "GEO评分",
    geoRadarTitle: "AI可引用性雷达",
    geoPageScores: "页面GEO评分",
    geoScore: "评分",
    geoScoreExcellent: "优秀的可引用性。内容极易被生成式AI引擎引用。",
    geoScoreGood: "良好的基础。改善数据点和语义清晰度以获得更好的AI引用。",
    geoScorePoor: "需要改进。添加事实数据、统计信息和结构化内容以提高AI可引用性。",
  },
};

for (const [locale, keys] of Object.entries(translations)) {
  const filePath = path.join(__dirname, "..", "messages", locale + ".json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  let added = 0;
  for (const [key, value] of Object.entries(keys)) {
    if (!(key in data.superAdmin)) {
      data.superAdmin[key] = value;
      added++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`${locale}: added ${added} missing superAdmin keys`);
}

console.log("\nDone.");
