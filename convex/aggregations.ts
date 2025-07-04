import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Simple password hashing function (for demo purposes)
function hashPassword(password: string): string {
  // Simple hash function for demo - in production, use proper hashing
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

function verifyPassword(password: string, hash: string): boolean {
  const hashedInput = hashPassword(password);
  return hashedInput === hash;
}

function generateRandomId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const createAggregation = mutation({
  args: {
    name: v.string(),
    password: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create aggregation");
    }

    const adminId = generateRandomId(12);
    const submissionId = generateRandomId(12);
    
    let aggregationData: any = {
      name: args.name,
      createdBy: userId,
      adminUrl: adminId,
      submissionUrl: submissionId,
    };

    // Add password protection if provided
    if (args.password) {
      const passwordHash = hashPassword(args.password);
      aggregationData.hasPassword = true;
      aggregationData.passwordHash = passwordHash;
    }
    
    const aggregationId = await ctx.db.insert("aggregations", aggregationData);

    // Add default name field
    await ctx.db.insert("submissionItems", {
      aggregationId,
      name: "Name",
      type: "list",
      required: true,
      order: 0,
    });

    return {
      aggregationId,
      adminUrl: adminId,
      submissionUrl: submissionId,
    };
  },
});

// Password verification for admin access
export const verifyAdminPassword = mutation({
  args: {
    adminUrl: v.string(),
    password: v.string()
  },
  handler: async (ctx, args) => {
    const aggregation = await ctx.db
      .query("aggregations")
      .withIndex("by_admin_url", (q) => q.eq("adminUrl", args.adminUrl))
      .unique();
    
    if (!aggregation) {
      throw new Error("提出物収集が見つかりません");
    }

    // If no password is set, allow access
    if (!aggregation.hasPassword || !aggregation.passwordHash) {
      return { success: true };
    }

    // Verify password
    const isValid = verifyPassword(args.password, aggregation.passwordHash);
    if (!isValid) {
      throw new Error("パスワードが正しくありません");
    }

    return { success: true };
  },
});

// Check if admin URL requires password
export const checkAdminPasswordRequired = query({
  args: { adminUrl: v.string() },
  handler: async (ctx, args) => {
    const aggregation = await ctx.db
      .query("aggregations")
      .withIndex("by_admin_url", (q) => q.eq("adminUrl", args.adminUrl))
      .unique();
    
    if (!aggregation) {
      return { exists: false, requiresPassword: false };
    }

    return {
      exists: true,
      requiresPassword: !!aggregation.hasPassword,
      name: aggregation.name
    };
  },
});

export const getAggregationByAdminUrl = query({
  args: { adminUrl: v.string() },
  handler: async (ctx, args) => {
    const aggregation = await ctx.db
      .query("aggregations")
      .withIndex("by_admin_url", (q) => q.eq("adminUrl", args.adminUrl))
      .unique();
    
    if (!aggregation) return null;

    const items = await ctx.db
      .query("submissionItems")
      .withIndex("by_aggregation", (q) => q.eq("aggregationId", aggregation._id))
      .collect();

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_aggregation", (q) => q.eq("aggregationId", aggregation._id))
      .collect();

    const submitters = await ctx.db
      .query("submitters")
      .withIndex("by_aggregation", (q) => q.eq("aggregationId", aggregation._id))
      .collect();

    // Get image URLs for submissions
    const submissionsWithUrls = await Promise.all(
      submissions.map(async (submission) => {
        const responsesWithUrls: Record<string, any> = {};
        for (const [key, value] of Object.entries(submission.responses)) {
          if (typeof value === "string" && value.startsWith("k")) {
            // This might be a storage ID
            const url = await ctx.storage.getUrl(value as any);
            responsesWithUrls[key] = url ? { storageId: value, url } : value;
          } else {
            responsesWithUrls[key] = value;
          }
        }
        return { ...submission, responses: responsesWithUrls };
      })
    );

    const respondents = submissions.map(s => s.submitterName);
    const nonRespondents = submitters.filter(s => !respondents.includes(s.name));

    return {
      ...aggregation,
      items: items.sort((a, b) => a.order - b.order),
      submissions: submissionsWithUrls,
      submitters,
      nonRespondents,
    };
  },
});

export const getAggregationBySubmissionUrl = query({
  args: { submissionUrl: v.string() },
  handler: async (ctx, args) => {
    const aggregation = await ctx.db
      .query("aggregations")
      .withIndex("by_submission_url", (q) => q.eq("submissionUrl", args.submissionUrl))
      .unique();
    
    if (!aggregation) return null;

    const items = await ctx.db
      .query("submissionItems")
      .withIndex("by_aggregation", (q) => q.eq("aggregationId", aggregation._id))
      .collect();

    const submitters = await ctx.db
      .query("submitters")
      .withIndex("by_aggregation", (q) => q.eq("aggregationId", aggregation._id))
      .collect();

    return {
      ...aggregation,
      items: items.sort((a, b) => a.order - b.order),
      submitters: submitters.map(s => s.name),
    };
  },
});

export const getUserAggregations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("aggregations")
      .withIndex("by_created_by", (q) => q.eq("createdBy", userId))
      .collect();
  },
});

export const addSubmitter = mutation({
  args: { 
    aggregationId: v.id("aggregations"),
    name: v.string() 
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Check if submitter already exists
    const existing = await ctx.db
      .query("submitters")
      .withIndex("by_aggregation", (q) => q.eq("aggregationId", args.aggregationId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .unique();

    if (existing) {
      throw new Error("Submitter already exists");
    }

    return await ctx.db.insert("submitters", {
      aggregationId: args.aggregationId,
      name: args.name,
    });
  },
});

export const updateSubmissionItems = mutation({
  args: {
    aggregationId: v.id("aggregations"),
    items: v.array(v.object({
      name: v.string(),
      type: v.union(
        v.literal("text"),
        v.literal("number"),
        v.literal("image"),
        v.literal("list")
      ),
      required: v.boolean(),
      options: v.optional(v.array(v.string())),
    }))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Delete existing items
    const existingItems = await ctx.db
      .query("submissionItems")
      .withIndex("by_aggregation", (q) => q.eq("aggregationId", args.aggregationId))
      .collect();

    for (const item of existingItems) {
      await ctx.db.delete(item._id);
    }

    // Insert new items
    for (let i = 0; i < args.items.length; i++) {
      const item = args.items[i];
      await ctx.db.insert("submissionItems", {
        aggregationId: args.aggregationId,
        name: item.name,
        type: item.type,
        required: item.required,
        options: item.options,
        order: i,
      });
    }
  },
});
