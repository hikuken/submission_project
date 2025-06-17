import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

type SubmissionItem = {
  name: string;
  type: "text" | "number" | "image" | "list";
  required: boolean;
  options?: string[];
};

export function Admin() {
  const { adminUrl } = useParams<{ adminUrl: string }>();
  const navigate = useNavigate();
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [showAddSubmitter, setShowAddSubmitter] = useState(false);
  const [newSubmitterName, setNewSubmitterName] = useState("");
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [downloadPrefix, setDownloadPrefix] = useState("");

  const aggregation = useQuery(api.aggregations.getAggregationByAdminUrl, 
    adminUrl ? { adminUrl } : "skip"
  );
  const addSubmitter = useMutation(api.aggregations.addSubmitter);
  const updateItems = useMutation(api.aggregations.updateSubmissionItems);
  const exportToExcel = useAction(api.exports.exportToExcel);


  if (!adminUrl) {
    return <div className="p-8 text-center">無効な管理者URLです</div>;
  }

  if (aggregation === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!aggregation) {
    return <div className="p-8 text-center">提出物収集が見つかりません</div>;
  }

  const handleAddSubmitter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubmitterName.trim()) return;

    try {
      await addSubmitter({
        aggregationId: aggregation._id,
        name: newSubmitterName.trim(),
      });
      setNewSubmitterName("");
      setShowAddSubmitter(false);
      toast.success("提出者が正常に追加されました");
    } catch (error) {
      toast.error("提出者の追加に失敗しました");
    }
  };

  const handleSaveItems = async () => {
    try {
      await updateItems({
        aggregationId: aggregation._id,
        items,
      });
      setShowItemEditor(false);
      toast.success("提出項目が正常に更新されました");
    } catch (error) {
      toast.error("提出項目の更新に失敗しました");
    }
  };

  const handleExport = async () => {
    try {
      const result = await exportToExcel({ adminUrl });
      const blob = new Blob([result.content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("エクスポートが正常にダウンロードされました");
    } catch (error) {
      toast.error("データのエクスポートに失敗しました");
    }
  };

  // 日本語項目名を英語キーにマッピング（提出画面と同じロジック）
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

  const handleDownloadImage = (url: string, submitterName: string, itemName: string) => {
    const filename = downloadPrefix ?
      `${downloadPrefix}_${submitterName}_${itemName}.jpg` :
      `${submitterName}_${itemName}.jpg`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const addItem = () => {
    setItems([...items, { name: "", type: "text", required: false }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SubmissionItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const submissionUrl = `${window.location.origin}/submit/${aggregation.submissionUrl}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-slate-800">{aggregation.name}</h1>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
          >
            ← ホームに戻る
          </button>
        </div>
        <p className="text-slate-600 mb-4">
          {aggregation.submissions.length}件の提出 • {aggregation.nonRespondents.length}件の未提出
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-700 mb-2">提出URL:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={submissionUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(submissionUrl);
                toast.success("URLがクリップボードにコピーされました");
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              コピー
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => {
              // 既存の項目を items ステートに設定
              if (aggregation?.items) {
                setItems(aggregation.items.map(item => ({
                  name: item.name,
                  type: item.type,
                  required: item.required,
                  options: item.options,
                })));
              }
              setShowItemEditor(true);
            }}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
          >
            項目を編集
          </button>
          <button
            onClick={() => setShowAddSubmitter(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            提出者を追加
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Excelにエクスポート
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <h2 className="text-xl font-semibold mb-4">提出物</h2>
          {aggregation.submissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              まだ提出物がありません
            </div>
          ) : (
            <div className="space-y-4">
              {aggregation.submissions.map((submission) => (
                <div key={submission._id} className="bg-white border border-slate-200 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-4">{submission.submitterName}</h3>
                  <div className="grid gap-4">
                    {aggregation.items.filter(item => !(item.type === "list" && item.name === "Name")).map((item) => {
                      const fieldKey = getFieldKey(item.name);
                      const response = submission.responses[fieldKey];
                      return (
                        <div key={item.name} className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="font-medium text-slate-700">{item.name}:</span>
                            <div className="mt-1">
                              {item.type === "image" && typeof response === "object" && response?.url ? (
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={response.url} 
                                    alt={item.name}
                                    className="w-20 h-20 object-cover rounded border"
                                  />
                                  <button
                                    onClick={() => handleDownloadImage(response.url, submission.submitterName, item.name)}
                                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                  >
                                    ダウンロード
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-600">
                                  {String(response || "回答なし")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold mb-4">未提出者</h3>
            {aggregation.nonRespondents.length === 0 ? (
              <p className="text-slate-500 text-sm">全員が提出済みです</p>
            ) : (
              <ul className="space-y-2">
                {aggregation.nonRespondents.map((submitter) => (
                  <li key={submitter._id} className="text-sm text-slate-600">
                    {submitter.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 mt-6">
            <h3 className="font-semibold mb-4">ダウンロード設定</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ファイル名プレフィックス
              </label>
              <input
                type="text"
                value={downloadPrefix}
                onChange={(e) => setDownloadPrefix(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                placeholder="オプションのプレフィックス..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Item Editor Modal */}
      {showItemEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">提出項目を編集</h2>
            
            <div className="space-y-4 mb-6">
              {items.map((item, index) => {
                if (item.name === "Name") return null;
                return (
                <div key={index} className="border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        項目名
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        種類
                      </label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(index, "type", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                      >
                        <option value="text">テキスト</option>
                        <option value="number">数値</option>
                        <option value="image">画像</option>
                        <option value="list">リスト</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={item.required}
                        onChange={(e) => updateItem(index, "required", e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-slate-700">必須</span>
                    </label>
                    
                    <button
                      onClick={() => removeItem(index)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      削除
                    </button>
                  </div>

                  {item.type === "list" && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        選択肢
                      </label>
                      <div className="space-y-2">
                        {(item.options || []).map((option, optionIndex) => (
                          <div key={optionIndex} className="flex gap-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(item.options || [])];
                                newOptions[optionIndex] = e.target.value;
                                updateItem(index, "options", newOptions);
                              }}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
                              placeholder={`選択肢${optionIndex + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newOptions = (item.options || []).filter((_, i) => i !== optionIndex);
                                updateItem(index, "options", newOptions);
                              }}
                              className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = [...(item.options || []), ""];
                            updateItem(index, "options", newOptions);
                          }}
                          className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                        >
                          + 選択肢を追加
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={addItem}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                項目を追加
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowItemEditor(false)}
                className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveItems}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                変更を保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Submitter Modal */}
      {showAddSubmitter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">提出者を追加</h2>
            <form onSubmit={handleAddSubmitter}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  提出者名
                </label>
                <input
                  type="text"
                  value={newSubmitterName}
                  onChange={(e) => setNewSubmitterName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddSubmitter(false)}
                  className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
