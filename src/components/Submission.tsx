import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function Submission() {
  const { submissionUrl } = useParams<{ submissionUrl: string }>();
  const [selectedSubmitter, setSelectedSubmitter] = useState("");
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const aggregation = useQuery(api.aggregations.getAggregationBySubmissionUrl, 
    submissionUrl ? { submissionUrl } : "skip"
  );
  const existingSubmission = useQuery(api.submissions.getSubmission,
    aggregation && selectedSubmitter ? {
      aggregationId: aggregation._id,
      submitterName: selectedSubmitter
    } : "skip"
  );
  const submitResponse = useMutation(api.submissions.submitResponse);
  const generateUploadUrl = useMutation(api.submissions.generateUploadUrl);

  if (!submissionUrl) {
    return <div className="p-8 text-center">無効な提出URLです</div>;
  }

  if (aggregation === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!aggregation) {
    return <div className="p-8 text-center">提出フォームが見つかりません</div>;
  }

  const handleSubmitterChange = (name: string) => {
    setSelectedSubmitter(name);
    // 提出者名はresponsesに含めない（submitterNameとして別途送信される）
    setErrors({});
  };

  // 日本語項目名を英語キーにマッピング
  const getFieldKey = (itemName: string): string => {
    const keyMap: Record<string, string> = {
      "名前": "name",
      "Name": "name",
      "年齢": "age",
      "住所": "address",
      "電話番号": "phone",
      "メールアドレス": "email",
      "コメント": "comment",
      "備考": "notes"
    };
    return keyMap[itemName] || itemName.replace(/[^\w]/g, '_').toLowerCase();
  };

  const handleResponseChange = (itemName: string, value: any) => {
    const fieldKey = getFieldKey(itemName);
    setResponses(prev => ({ ...prev, [fieldKey]: value }));
    if (errors[itemName]) {
      setErrors(prev => ({ ...prev, [itemName]: "" }));
    }
  };

  const handleFileUpload = async (itemName: string, file: File) => {
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("アップロードに失敗しました");
      }
      
      const { storageId } = await result.json();
      handleResponseChange(itemName, storageId);
      toast.success("ファイルが正常にアップロードされました");
    } catch (error) {
      toast.error("ファイルのアップロードに失敗しました");
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    aggregation.items.forEach(item => {
      // 提出者選択の場合は特別処理
      if (item.name === "Name" && item.type === "list") {
        if (item.required && !selectedSubmitter) {
          newErrors[item.name] = `${item.name}は必須項目です`;
        }
      } else {
        // その他の項目は通常通り（変換されたキーを使用）
        const fieldKey = getFieldKey(item.name);
        if (item.required && (!responses[fieldKey] || responses[fieldKey] === "")) {
          newErrors[item.name] = `${item.name}は必須項目です`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // デバッグログ：提出開始
    console.log("[DEBUG] 提出処理開始");
    console.log("[DEBUG] selectedSubmitter:", selectedSubmitter);
    console.log("[DEBUG] responses:", responses);
    console.log("[DEBUG] aggregation._id:", aggregation._id);
    
    if (!validateForm()) {
      console.log("[DEBUG] バリデーションエラー");
      toast.error("必須項目をすべて入力してください");
      return;
    }

    console.log("[DEBUG] バリデーション成功");
    setIsSubmitting(true);
    try {
      console.log("[DEBUG] submitResponse呼び出し開始");
      console.log("[DEBUG] 送信データ:", {
        aggregationId: aggregation._id,
        submitterName: selectedSubmitter,
        responses,
      });
      await submitResponse({
        aggregationId: aggregation._id,
        submitterName: selectedSubmitter,
        responses,
      });
      
      console.log("[DEBUG] submitResponse成功");
      toast.success("提出が正常に保存されました！");
    } catch (error) {
      console.error("[DEBUG] submitResponseエラー:", error);
      toast.error(`提出の保存に失敗しました: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-white rounded-lg border border-slate-200 p-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">{aggregation.name}</h1>
        <p className="text-slate-600 mb-8">以下のフォームにご記入ください</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {aggregation.items.map((item) => (
            <div key={item.name}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {item.name === "Name" ? "提出者" : item.name}
                {item.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {item.type === "list" && item.name === "Name" ? (
                <div>
                  <select
                    value={selectedSubmitter}
                    onChange={(e) => handleSubmitterChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[item.name] ? "border-red-500" : "border-slate-300"
                    }`}
                    required={item.required}
                  >
                    <option value="">お名前を選択してください...</option>
                    {aggregation.submitters && aggregation.submitters.length > 0 ? (
                      aggregation.submitters.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))
                    ) : (
                      <option value="" disabled>提出者が登録されていません</option>
                    )}
                  </select>
                  {(!aggregation.submitters || aggregation.submitters.length === 0) && (
                    <p className="text-amber-600 text-sm mt-1">
                      ⚠️ 管理者によって提出者が登録されていません。管理者にお問い合わせください。
                    </p>
                  )}
                </div>
              ) : item.type === "text" ? (
                <input
                  type="text"
                  value={responses[getFieldKey(item.name)] || ""}
                  onChange={(e) => handleResponseChange(item.name, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[item.name] ? "border-red-500" : "border-slate-300"
                  }`}
                  required={item.required}
                />
              ) : item.type === "number" ? (
                <input
                  type="number"
                  value={responses[getFieldKey(item.name)] || ""}
                  onChange={(e) => handleResponseChange(item.name, parseFloat(e.target.value) || "")}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[item.name] ? "border-red-500" : "border-slate-300"
                  }`}
                  required={item.required}
                />
              ) : item.type === "image" ? (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={(el) => { fileInputRefs.current[item.name] = el; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(item.name, file);
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[item.name] ? "border-red-500" : "border-slate-300"
                    }`}
                    required={item.required && !responses[getFieldKey(item.name)]}
                  />
                  {responses[getFieldKey(item.name)] && (
                    <p className="text-sm text-green-600 mt-1">✓ ファイルがアップロードされました</p>
                  )}
                </div>
              ) : item.type === "list" && item.options ? (
                <select
                  value={responses[getFieldKey(item.name)] || ""}
                  onChange={(e) => handleResponseChange(item.name, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[item.name] ? "border-red-500" : "border-slate-300"
                  }`}
                  required={item.required}
                >
                  <option value="">選択してください...</option>
                  {item.options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : null}

              {errors[item.name] && (
                <p className="text-red-500 text-sm mt-1">{errors[item.name]}</p>
              )}
            </div>
          ))}

          {existingSubmission && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ すでに提出済みです。再度提出すると前回の提出内容が更新されます。
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "提出中..." : "提出"}
          </button>
        </form>
      </div>
    </div>
  );
}
