import { cookies } from "next/headers";

const COOKIE_NAME = "buildwrk_use_gl_ar_ap";

/**
 * Server-side helper: returns true if the user has enabled
 * "Include Project & Property AR/AP" on the AR or AP page.
 * The cookie is set by the client-side toggle in ARClient / APClient.
 */
export async function useGLForArAp(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "true";
}
