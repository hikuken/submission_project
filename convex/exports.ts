import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const exportToExcel = action({
  args: { adminUrl: v.string() },
  handler: async (ctx, args): Promise<{ filename: string; content: string }> => {
    const aggregation = await ctx.runQuery(api.aggregations.getAggregationByAdminUrl, {
      adminUrl: args.adminUrl
    });

    if (!aggregation) {
      throw new Error("提出物収集が見つかりません");
    }

    // Create CSV data (simplified Excel export)
    const headers = ["提出者", ...aggregation.items.map((item: any) => item.name)];
    const rows = aggregation.submissions.map((submission: any) => {
      const row = [submission.submitterName];
      aggregation.items.forEach((item: any) => {
        const response = submission.responses[item.name];
        if (typeof response === "object" && response?.url) {
          row.push(response.url);
        } else {
          row.push(String(response || ""));
        }
      });
      return row;
    });

    const csvContent = [headers, ...rows]
      .map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return {
      filename: `${aggregation.name}_提出物.csv`,
      content: csvContent,
    };
  },
});
