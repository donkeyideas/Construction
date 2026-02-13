import { Receipt } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Invoice ${id.substring(0, 8)} - ConstructionERP` };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Invoice Detail</h2>
          <p className="fin-header-sub">Invoice ID: {id.substring(0, 8)}</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><Receipt size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
