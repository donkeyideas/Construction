"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ARAPAgingChart from "@/components/charts/ARAPAgingChart";
import CashFlowChart from "@/components/CashFlowChart";
import IncomeExpensesChart from "@/components/charts/IncomeExpensesChart";
import ProjectBudgetChart from "@/components/charts/ProjectBudgetChart";
import ProjectCompletionChart from "@/components/charts/ProjectCompletionChart";
import IncidentTrendChart from "@/components/charts/IncidentTrendChart";
import IncidentTypeChart from "@/components/charts/IncidentTypeChart";
import EquipmentStatusChart from "@/components/charts/EquipmentStatusChart";
import EquipmentTypeChart from "@/components/charts/EquipmentTypeChart";
import type { AgingBucket, CashFlowItem } from "@/lib/queries/dashboard";

interface SubChart {
  label: string;
  component: React.ReactNode;
}

interface Props {
  agingData: AgingBucket[];
  cashFlowData: CashFlowItem[];
  monthlyIncomeExpenses: { month: string; income: number; expenses: number }[];
  budgetProjects: { name: string; estimated: number; actual: number }[];
  projectCompletionData: { name: string; completion_pct: number }[];
  incidentTrend: { month: string; count: number; oshaCount: number }[];
  incidentTypeBreakdown: { type: string; count: number }[];
  safetyKPIs: {
    incidentsYTD: number;
    daysSinceLastIncident: number;
    oshaRecordableCount: number;
  };
  equipmentStatusBreakdown: { status: string; count: number }[];
  equipmentTotal: number;
  equipmentTypeBreakdown: { type: string; count: number }[];
  equipmentUtilizationRate: number;
  showFinancials: boolean;
}

function SafetyKPISummary({ data }: { data: Props["safetyKPIs"] }) {
  const t = useTranslations("common");
  return (
    <div className="dash-safety-kpi-grid">
      <div className="dash-safety-kpi">
        <span className="dash-safety-kpi-value">{data.incidentsYTD}</span>
        <span className="dash-safety-kpi-label">{t("charts.incidentsYTD")}</span>
      </div>
      <div className="dash-safety-kpi">
        <span className="dash-safety-kpi-value">
          {data.daysSinceLastIncident >= 999 ? t("charts.na") : data.daysSinceLastIncident}
        </span>
        <span className="dash-safety-kpi-label">{t("charts.daysSinceLast")}</span>
      </div>
      <div className="dash-safety-kpi">
        <span className="dash-safety-kpi-value">{data.oshaRecordableCount}</span>
        <span className="dash-safety-kpi-label">{t("charts.oshaRecordable")}</span>
      </div>
    </div>
  );
}

export default function DashboardChartCarousel(props: Props) {
  const t = useTranslations("common");
  const {
    agingData,
    cashFlowData,
    monthlyIncomeExpenses,
    budgetProjects,
    projectCompletionData,
    incidentTrend,
    incidentTypeBreakdown,
    safetyKPIs,
    equipmentStatusBreakdown,
    equipmentTotal,
    equipmentTypeBreakdown,
    showFinancials,
  } = props;

  const [subIdx, setSubIdx] = useState<Record<string, number>>({
    financial: 0,
    scheduling: 0,
    operations: 0,
    equipment: 0,
  });

  const financialCharts: SubChart[] = [
    { label: t("charts.arapAging"), component: <ARAPAgingChart data={agingData} /> },
    { label: t("charts.cashFlow"), component: <CashFlowChart data={cashFlowData} /> },
    { label: t("charts.incomeVsExpenses"), component: <IncomeExpensesChart data={monthlyIncomeExpenses} /> },
  ];

  const schedulingCharts: SubChart[] = [
    { label: t("charts.budgetVsActual"), component: <ProjectBudgetChart data={budgetProjects} height={220} /> },
    { label: t("charts.completionRate"), component: <ProjectCompletionChart data={projectCompletionData} /> },
  ];

  const operationsCharts: SubChart[] = [
    { label: t("charts.incidentTrend"), component: <IncidentTrendChart data={incidentTrend} /> },
    { label: t("charts.incidentTypes"), component: <IncidentTypeChart data={incidentTypeBreakdown} /> },
    { label: t("charts.safetyKPIs"), component: <SafetyKPISummary data={safetyKPIs} /> },
  ];

  const equipmentCharts: SubChart[] = [
    { label: t("charts.byType"), component: <EquipmentTypeChart data={equipmentTypeBreakdown} /> },
    { label: t("charts.status"), component: <EquipmentStatusChart data={equipmentStatusBreakdown} total={equipmentTotal} /> },
  ];

  const defaultTab = showFinancials ? "financial" : "scheduling";

  function navigate(tabKey: string, charts: SubChart[], dir: -1 | 1) {
    setSubIdx((prev) => ({
      ...prev,
      [tabKey]: (((prev[tabKey] ?? 0) + dir) % charts.length + charts.length) % charts.length,
    }));
  }

  function renderCarousel(tabKey: string, charts: SubChart[]) {
    const idx = subIdx[tabKey] ?? 0;

    return (
      <div className="dash-subchart-carousel">
        <div className="dash-subchart-header">
          <div className="dash-subchart-label">{charts[idx]?.label}</div>
          {charts.length > 1 && (
            <div className="dash-subchart-nav">
              <button
                className="dash-subchart-arrow"
                onClick={() => navigate(tabKey, charts, -1)}
                aria-label={t("charts.previousChart")}
              >
                <ChevronLeft size={14} />
              </button>
              <div className="dash-subchart-dots">
                {charts.map((c, i) => (
                  <button
                    key={i}
                    className={`dash-subchart-dot ${i === idx ? "active" : ""}`}
                    onClick={() => setSubIdx((prev) => ({ ...prev, [tabKey]: i }))}
                    aria-label={c.label}
                    title={c.label}
                  />
                ))}
              </div>
              <button
                className="dash-subchart-arrow"
                onClick={() => navigate(tabKey, charts, 1)}
                aria-label={t("charts.nextChart")}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="dash-subchart-area">
          {charts[idx]?.component}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        {showFinancials && <TabsTrigger value="financial">{t("charts.financialHealth")}</TabsTrigger>}
        <TabsTrigger value="scheduling">{t("charts.scheduleProgress")}</TabsTrigger>
        <TabsTrigger value="operations">{t("charts.operationsRisk")}</TabsTrigger>
        <TabsTrigger value="equipment">{t("charts.procurementEquipment")}</TabsTrigger>
      </TabsList>

      {showFinancials && (
        <TabsContent value="financial">
          {renderCarousel("financial", financialCharts)}
        </TabsContent>
      )}

      <TabsContent value="scheduling">
        {renderCarousel("scheduling", schedulingCharts)}
      </TabsContent>

      <TabsContent value="operations">
        {renderCarousel("operations", operationsCharts)}
      </TabsContent>

      <TabsContent value="equipment">
        {renderCarousel("equipment", equipmentCharts)}
      </TabsContent>
    </Tabs>
  );
}
