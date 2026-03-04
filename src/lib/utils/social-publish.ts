import { TwitterApi } from "twitter-api-v2";
import { getPlatformSetting } from "@/lib/queries/platform-settings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

export interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface LinkedInCredentials {
  accessToken: string;
}

export interface FacebookCredentials {
  accessToken: string;
  pageId: string;
}

// ---------------------------------------------------------------------------
// Credential helpers
// ---------------------------------------------------------------------------

export async function getTwitterCredentials(): Promise<TwitterCredentials | null> {
  const [apiKey, apiSecret, accessToken, accessTokenSecret] =
    await Promise.all([
      getPlatformSetting("social_twitter_api_key"),
      getPlatformSetting("social_twitter_api_secret"),
      getPlatformSetting("social_twitter_access_token"),
      getPlatformSetting("social_twitter_access_token_secret"),
    ]);

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) return null;
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

export async function getLinkedInCredentials(): Promise<LinkedInCredentials | null> {
  const accessToken = await getPlatformSetting("social_linkedin_access_token");
  if (!accessToken) return null;
  return { accessToken };
}

export async function getFacebookCredentials(): Promise<FacebookCredentials | null> {
  const [accessToken, pageId] = await Promise.all([
    getPlatformSetting("social_facebook_access_token"),
    getPlatformSetting("social_facebook_page_id"),
  ]);

  if (!accessToken || !pageId) return null;
  return { accessToken, pageId };
}

// ---------------------------------------------------------------------------
// Build final content (append hashtags)
// ---------------------------------------------------------------------------

function buildContent(content: string, hashtags: string[]): string {
  if (!hashtags.length) return content;
  const tags = [...new Set(hashtags)]
    .map((h) => `#${h.replace(/^#/, "")}`)
    .join(" ");
  return `${content}\n\n${tags}`;
}

// ---------------------------------------------------------------------------
// Twitter publishing
// ---------------------------------------------------------------------------

export async function publishToTwitter(
  content: string,
  hashtags: string[],
  credentials: TwitterCredentials
): Promise<PublishResult> {
  try {
    const client = new TwitterApi({
      appKey: credentials.apiKey,
      appSecret: credentials.apiSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessTokenSecret,
    });

    const fullContent = buildContent(content, hashtags);
    // Truncate to 280 if needed
    const text =
      fullContent.length > 280 ? fullContent.slice(0, 277) + "..." : fullContent;

    const { data } = await client.v2.tweet(text);

    return {
      success: true,
      externalPostId: data.id,
    };
  } catch (err) {
    console.error("Twitter publish error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Twitter publish failed",
    };
  }
}

// ---------------------------------------------------------------------------
// LinkedIn publishing
// ---------------------------------------------------------------------------

export async function publishToLinkedIn(
  content: string,
  hashtags: string[],
  credentials: LinkedInCredentials
): Promise<PublishResult> {
  try {
    // First, get the user's LinkedIn person URN
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (!profileRes.ok) {
      return {
        success: false,
        error: `LinkedIn profile fetch failed: ${profileRes.status}`,
      };
    }

    const profile = await profileRes.json();
    const personUrn = `urn:li:person:${profile.sub}`;

    const fullContent = buildContent(content, hashtags);

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: personUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: fullContent },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return {
        success: false,
        error: `LinkedIn API error ${res.status}: ${errorBody}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      externalPostId: data.id,
    };
  } catch (err) {
    console.error("LinkedIn publish error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "LinkedIn publish failed",
    };
  }
}

// ---------------------------------------------------------------------------
// Facebook publishing
// ---------------------------------------------------------------------------

export async function publishToFacebook(
  content: string,
  hashtags: string[],
  credentials: FacebookCredentials
): Promise<PublishResult> {
  try {
    const fullContent = buildContent(content, hashtags);

    const url = new URL(
      `https://graph.facebook.com/v19.0/${credentials.pageId}/feed`
    );
    url.searchParams.set("access_token", credentials.accessToken);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: fullContent }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return {
        success: false,
        error: `Facebook API error ${res.status}: ${errorBody}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      externalPostId: data.id,
    };
  } catch (err) {
    console.error("Facebook publish error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Facebook publish failed",
    };
  }
}

// ---------------------------------------------------------------------------
// Platform dispatch
// ---------------------------------------------------------------------------

export async function publishPost(
  platform: string,
  content: string,
  hashtags: string[]
): Promise<PublishResult> {
  switch (platform) {
    case "twitter": {
      const creds = await getTwitterCredentials();
      if (!creds)
        return { success: false, error: "Twitter credentials not configured" };
      return publishToTwitter(content, hashtags, creds);
    }
    case "linkedin": {
      const creds = await getLinkedInCredentials();
      if (!creds)
        return {
          success: false,
          error: "LinkedIn credentials not configured",
        };
      return publishToLinkedIn(content, hashtags, creds);
    }
    case "facebook": {
      const creds = await getFacebookCredentials();
      if (!creds)
        return {
          success: false,
          error: "Facebook credentials not configured",
        };
      return publishToFacebook(content, hashtags, creds);
    }
    case "instagram":
      return {
        success: false,
        error: "Instagram text-only posts are not supported via API",
      };
    case "tiktok":
      return {
        success: false,
        error: "TikTok publishing is not yet implemented",
      };
    default:
      return { success: false, error: `Unknown platform: ${platform}` };
  }
}

// ---------------------------------------------------------------------------
// Connection testing
// ---------------------------------------------------------------------------

export async function testConnection(
  platform: string
): Promise<PublishResult> {
  switch (platform) {
    case "twitter": {
      const creds = await getTwitterCredentials();
      if (!creds)
        return { success: false, error: "Credentials not configured" };
      try {
        const client = new TwitterApi({
          appKey: creds.apiKey,
          appSecret: creds.apiSecret,
          accessToken: creds.accessToken,
          accessSecret: creds.accessTokenSecret,
        });
        const { data } = await client.v2.me();
        return {
          success: true,
          externalPostId: data.username,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Connection failed",
        };
      }
    }
    case "linkedin": {
      const creds = await getLinkedInCredentials();
      if (!creds)
        return { success: false, error: "Credentials not configured" };
      try {
        const res = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
        });
        if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
        const data = await res.json();
        return { success: true, externalPostId: data.name || data.sub };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Connection failed",
        };
      }
    }
    case "facebook": {
      const creds = await getFacebookCredentials();
      if (!creds)
        return { success: false, error: "Credentials not configured" };
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${creds.pageId}?access_token=${creds.accessToken}&fields=name`
        );
        if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
        const data = await res.json();
        return { success: true, externalPostId: data.name };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Connection failed",
        };
      }
    }
    default:
      return { success: false, error: `Platform not supported: ${platform}` };
  }
}
