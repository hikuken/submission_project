import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const submitResponse = mutation({
  args: {
    aggregationId: v.id("aggregations"),
    submitterName: v.string(),
    responses: v.record(v.string(), v.union(
      v.string(),
      v.number(),
      v.boolean(),
      v.id("_storage")
    )),
  },
  handler: async (ctx, args) => {
    // Check if submission already exists
    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_aggregation_and_submitter", (q) => 
        q.eq("aggregationId", args.aggregationId).eq("submitterName", args.submitterName)
      )
      .unique();

    if (existing) {
      // Update existing submission
      await ctx.db.patch(existing._id, {
        responses: args.responses,
      });
      return existing._id;
    } else {
      // Create new submission
      return await ctx.db.insert("submissions", {
        aggregationId: args.aggregationId,
        submitterName: args.submitterName,
        responses: args.responses,
      });
    }
  },
});

export const getSubmission = query({
  args: {
    aggregationId: v.id("aggregations"),
    submitterName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_aggregation_and_submitter", (q) => 
        q.eq("aggregationId", args.aggregationId).eq("submitterName", args.submitterName)
      )
      .unique();
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
