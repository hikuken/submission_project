import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  aggregations: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    adminUrl: v.string(),
    submissionUrl: v.string(),
  }).index("by_admin_url", ["adminUrl"])
    .index("by_submission_url", ["submissionUrl"])
    .index("by_created_by", ["createdBy"]),

  submissionItems: defineTable({
    aggregationId: v.id("aggregations"),
    name: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("number"),
      v.literal("image"),
      v.literal("list")
    ),
    required: v.boolean(),
    options: v.optional(v.array(v.string())), // For multiple-choice and list types
    order: v.number(),
  }).index("by_aggregation", ["aggregationId", "order"]),

  submissions: defineTable({
    aggregationId: v.id("aggregations"),
    submitterName: v.string(),
    responses: v.record(v.string(), v.union(
      v.string(),
      v.number(),
      v.boolean(),
      v.id("_storage")
    )),
  }).index("by_aggregation", ["aggregationId"])
    .index("by_aggregation_and_submitter", ["aggregationId", "submitterName"]),

  submitters: defineTable({
    aggregationId: v.id("aggregations"),
    name: v.string(),
  }).index("by_aggregation", ["aggregationId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
