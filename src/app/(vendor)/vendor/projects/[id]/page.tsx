import { HardHat } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Project ${id.substring(0, 8)} - ConstructionERP` };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Project Detail</h2>
          <p className="fin-header-sub">Project ID: {id.substring(0, 8)}</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><HardHat size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
