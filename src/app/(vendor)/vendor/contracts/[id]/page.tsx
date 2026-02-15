import { FileText } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Contract ${id.substring(0, 8)} - Buildwrk` };
}

export default async function ContractDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Contract Detail</h2>
          <p className="fin-header-sub">Contract ID: {id.substring(0, 8)}</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><FileText size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
