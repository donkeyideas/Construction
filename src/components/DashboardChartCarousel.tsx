"use client";

import { useState } from "react";
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
  return (
    <div className="dash-safety-kpi-grid">
      <div className="dash-safety-kpi">
        <span className="dash-safety-kpi-value">{data.incidentsYTD}</span>
        <span className="dash-safety-kpi-label">Incidents YTD</span>
      </div>
      <div className="dash-safety-kpi">
        <span className="dash-safety-kpi-value">
          {data.daysSinceLastIncident >= 999 ? "N/A" : data.daysSinceLastIncident}
        </span>
        <span className="dash-safety-kpi-label">Days Since Last</span>
      </div>
      <div className="dash-safety-kpi">
        <span className="dash-safety-kpi-value">{data.oshaRecordableCount}</span>
        <span className="dash-safety-kpi-label">OSHA Recordable</span>
      </div>
    </div>
  );
}

export default function DashboardChartCarousel(props: Props) {
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
    { label: "AR/AP Aging", component: <ARAPAgingChart data={agingData} /> },
    { label: "Cash Flow", component: <CashFlowChart data={cashFlowData} /> },
    { label: "Income vs Expenses", component: <IncomeExpensesChart data={monthlyIncomeExpenses} /> },
  ];

  const schedulingCharts: SubChart[] = [
    { label: "Budget vs Actual", component: <ProjectBudgetChart data={budgetProjects} height={220} /> },
    { label: "Completion Rate", component: <ProjectCompletionChart data={projectCompletionData} /> },
  ];

  const operationsCharts: SubChart[] = [
    { label: "Incident Trend", component: <IncidentTrendChart data={incidentTrend} /> },
    { label: "Incident Types", component: <IncidentTypeChart data={incidentTypeBreakdown} /> },
    { label: "Safety KPIs", component: <SafetyKPISummary data={safetyKPIs} /> },
  ];

  const equipmentCharts: SubChart[] = [
    { label: "Status", component: <EquipmentStatusChart data={equipmentStatusBreakdown} total={equipmentTotal} /> },
    { label: "By Type", component: <EquipmentTypeChart data={equipmentTypeBreakdown} /> },
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
        <div className="dash-subchart-label">{charts[idx]?.label}</div>
        <div className="dash-subchart-area">
          {charts[idx]?.component}
        </div>
        {charts.length > 1 && (
          <div className="dash-subchart-nav">
            <button
              className="dash-subchart-arrow"
              onClick={() => navigate(tabKey, charts, -1)}
              aria-label="Previous chart"
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
              aria-label="Next chart"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        {showFinancials && <TabsTrigger value="financial">Financial Health</TabsTrigger>}
        <TabsTrigger value="scheduling">Schedule & Progress</TabsTrigger>
        <TabsTrigger value="operations">Operations & Risk</TabsTrigger>
        <TabsTrigger value="equipment">Procurement & Equipment</TabsTrigger>
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
