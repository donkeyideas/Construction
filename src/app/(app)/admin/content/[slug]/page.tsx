import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCmsPageBySlug } from "@/lib/queries/content";
import ContentEditorClient from "./ContentEditorClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;

  if (slug === "new") {
    return { title: "New Page - Buildwrk" };
  }

  return { title: `Edit Page - Buildwrk` };
}

export default async function ContentEditorPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    notFound();
  }

  const { companyId, userId } = userCompany;
  const isNew = slug === "new";

  let page = null;
  if (!isNew) {
    page = await getCmsPageBySlug(supabase, companyId, slug);
    if (!page) {
      notFound();
    }
  }

  return (
    <div>
      <Link href="/admin/content" className="editor-back">
        <ArrowLeft size={16} />
        Back to Content Manager
      </Link>

      <div className="content-header">
        <div>
          <h2>{isNew ? "Create New Page" : page!.title}</h2>
          <p className="content-header-sub">
            {isNew
              ? "Set up a new content page with structured content and SEO metadata."
              : `Editing /${page!.slug}`}
          </p>
        </div>
      </div>

      <ContentEditorClient
        page={page}
        isNew={isNew}
        userId={userId}
      />
    </div>
  );
}
