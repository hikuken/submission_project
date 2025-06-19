import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function Home() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [aggregationName, setAggregationName] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createAggregation = useMutation(api.aggregations.createAggregation);
  const userAggregations = useQuery(api.aggregations.getUserAggregations);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aggregationName.trim()) return;

    if (hasPassword) {
      setShowCreateForm(false);
      setShowPasswordForm(true);
    } else {
      handleCreate();
    }
  };

  const handleCreate = async (passwordValue?: string) => {
    setIsCreating(true);
    try {
      const result = await createAggregation({
        name: aggregationName.trim(),
        password: passwordValue || (hasPassword ? password : undefined)
      });
      
      // Show URLs to user
      const adminUrl = `${window.location.origin}/admin/${result.adminUrl}`;
      const submissionUrl = `${window.location.origin}/submit/${result.submissionUrl}`;
      
      toast.success("提出物収集が正常に作成されました！", {
        description: "URLがクリップボードにコピーされました",
        duration: 5000,
      });

      // Copy URLs to clipboard
      navigator.clipboard.writeText(`管理者URL: ${adminUrl}\n提出URL: ${submissionUrl}`);
      
      // Reset form
      setAggregationName("");
      setHasPassword(false);
      setPassword("");
      setShowCreateForm(false);
      setShowPasswordForm(false);
      
      // Navigate to admin page
      window.open(adminUrl, '_blank');
    } catch (error) {
      toast.error("提出物収集の作成に失敗しました");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    handleCreate(password.trim());
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">提出物管理システム</h1>
        <p className="text-xl text-slate-600 mb-8">
          提出物の収集と管理を簡単に行えます
        </p>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-sm hover:shadow transition-all"
        >
          新しい提出物収集を作成
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">新しい提出物収集を作成</h2>
            <form onSubmit={handleNameSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  提出物収集名
                </label>
                <input
                  type="text"
                  id="name"
                  value={aggregationName}
                  onChange={(e) => setAggregationName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="提出物収集名を入力..."
                  required
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hasPassword}
                    onChange={(e) => setHasPassword(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-700">パスワードをつける</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setAggregationName("");
                    setHasPassword(false);
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !aggregationName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {hasPassword ? "次へ" : (isCreating ? "作成中..." : "作成")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">パスワードを設定</h2>
            <p className="text-sm text-slate-600 mb-4">
              管理者画面にアクセスするためのパスワードを設定してください
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="パスワードを入力..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setShowCreateForm(true);
                    setPassword("");
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !password.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? "作成中..." : "作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userAggregations && userAggregations.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6">あなたの提出物収集</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userAggregations.map((aggregation) => (
              <div key={aggregation._id} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-slate-800 mb-2">{aggregation.name}</h3>
                <p className="text-sm text-slate-600 mb-4">
                  作成日: {new Date(aggregation._creationTime).toLocaleDateString('ja-JP')}
                </p>
                <div className="flex gap-2">
                  <a
                    href={`/admin/${aggregation.adminUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    管理
                  </a>
                  <a
                    href={`/submit/${aggregation.submissionUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    提出
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
