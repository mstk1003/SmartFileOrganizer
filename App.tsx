
import React, { useState, useMemo, useRef } from 'react';
import { 
  FolderOpen, 
  Settings, 
  Play, 
  RefreshCcw, 
  FileText, 
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react';
import { RulePart, FileItem, PreviewItem, AppSettings, RuleType } from './types';
import { formatSize, getTodayStr } from './utils/formatters';
import RuleChip from './components/RuleChip';

const INITIAL_FILES: FileItem[] = [
  { id: '1', originalName: 'IMG_2023_99', extension: 'jpg', size: 2450000, createdAt: '2023-12-20' },
  { id: '2', originalName: 'scan-document-01', extension: 'pdf', size: 1200000, createdAt: '2023-12-21' },
  { id: '3', originalName: 'final_version_v2', extension: 'docx', size: 45000, createdAt: '2023-12-22' },
  { id: '4', originalName: 'memo_backup', extension: 'txt', size: 1200, createdAt: '2023-12-23' },
];

const App: React.FC = () => {
  // State
  const [settings, setSettings] = useState<AppSettings>({
    sourcePath: 'C:\\Users\\Staff\\Downloads\\Unsorted',
    targetPath: 'C:\\Users\\Staff\\Documents\\Organized',
    delimiter: '_',
    sequenceDigits: 2,
  });

  const [rules, setRules] = useState<RulePart[]>([
    { id: 'r1', type: 'date', enabled: true },
    { id: 'r2', type: 'string', value: '事務書類', enabled: true },
    { id: 'r3', type: 'sequence', enabled: true },
  ]);

  const [files, setFiles] = useState<FileItem[]>(INITIAL_FILES);
  const [processing, setProcessing] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<PreviewItem[]>([]);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Derived State (Preview calculation)
  const previews = useMemo(() => {
    return files.map((file, index) => {
      const parts: string[] = [];
      rules.forEach(rule => {
        if (!rule.enabled) return;
        switch (rule.type) {
          case 'date':
            parts.push(getTodayStr());
            break;
          case 'sequence':
            parts.push((index + 1).toString().padStart(settings.sequenceDigits, '0'));
            break;
          case 'string':
            if (rule.value) parts.push(rule.value);
            break;
        }
      });
      const newBaseName = parts.join(settings.delimiter);
      return {
        ...file,
        newName: `${newBaseName}.${file.extension}`,
        targetPath: `${settings.targetPath}\\${newBaseName}.${file.extension}`,
        status: 'pending' as const,
      };
    });
  }, [files, rules, settings]);

  // Handlers
  const addRule = (type: RuleType) => {
    const newRule: RulePart = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      enabled: true,
      value: type === 'string' ? '' : undefined
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const updateRuleValue = (id: string, value: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, value } : r));
  };

  // Live Reordering Logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Set a transparent drag image to avoid double visual
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragEnter = (e: React.DragEvent, targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newRules = [...rules];
    const draggedItem = newRules[draggedIndex];
    newRules.splice(draggedIndex, 1);
    newRules.splice(targetIndex, 0, draggedItem);
    
    setDraggedIndex(targetIndex);
    setRules(newRules);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const executeRenaming = async () => {
    setProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const results = previews.map(p => ({
      ...p,
      status: 'success' as const,
      message: '整理完了しました'
    }));
    setLogs(results);
    setFiles([]);
    setProcessing(false);
    setShowLog(true);
  };

  const resetSimulation = () => {
    setFiles(INITIAL_FILES);
    setLogs([]);
    setShowLog(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <RefreshCcw className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">スマート・ファイル整理 Pro</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">File Automation Utility</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={resetSimulation}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              シミュレーションリセット
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4 text-slate-800">
                <Settings className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold">フォルダ設定</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-tight">ソース（元のフォルダ）</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={settings.sourcePath}
                      className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-600 focus:outline-none"
                    />
                    <button className="bg-slate-100 p-2 rounded border border-slate-200 hover:bg-slate-200 transition-colors">
                      <FolderOpen className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-tight">ターゲット（整理先フォルダ）</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={settings.targetPath}
                      className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-600 focus:outline-none"
                    />
                    <button className="bg-slate-100 p-2 rounded border border-slate-200 hover:bg-slate-200 transition-colors">
                      <FolderOpen className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Play className="w-5 h-5 text-green-500" />
                  <h2 className="font-bold">命名ルールの構築</h2>
                </div>
                <div className="relative group">
                  <Info className="w-4 h-4 text-slate-400 cursor-help" />
                  <div className="absolute right-0 top-6 w-64 p-3 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    チップを並び替えて構成を決定します。
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6 flex-1 overflow-y-auto max-h-[400px] pr-1">
                {rules.map((rule, idx) => (
                  <RuleChip
                    key={rule.id}
                    part={rule}
                    index={idx}
                    isDragging={draggedIndex === idx}
                    onRemove={removeRule}
                    onUpdate={updateRuleValue}
                    onDragStart={handleDragStart}
                    onDragEnter={handleDragEnter}
                    onDragEnd={handleDragEnd}
                  />
                ))}
                {rules.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-lg text-slate-400 italic text-sm">
                    ルールが追加されていません
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => addRule('date')}
                    className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded text-[10px] font-bold text-slate-600 hover:text-blue-600 transition-all"
                  >
                    <Plus className="w-4 h-4" /> 日付
                  </button>
                  <button 
                    onClick={() => addRule('sequence')}
                    className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded text-[10px] font-bold text-slate-600 hover:text-blue-600 transition-all"
                  >
                    <Plus className="w-4 h-4" /> 連番
                  </button>
                  <button 
                    onClick={() => addRule('string')}
                    className="flex flex-col items-center gap-1 p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded text-[10px] font-bold text-slate-600 hover:text-blue-600 transition-all"
                  >
                    <Plus className="w-4 h-4" /> 固定文字
                  </button>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">区切り文字</label>
                    <select 
                      value={settings.delimiter}
                      onChange={(e) => setSettings({...settings, delimiter: e.target.value})}
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1.5"
                    >
                      <option value="_">アンダースコア (_)</option>
                      <option value="-">ハイフン (-)</option>
                      <option value=" ">スペース ( )</option>
                      <option value="">なし</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">連番の桁数</label>
                    <input 
                      type="number"
                      min="1"
                      max="5"
                      value={settings.sequenceDigits}
                      onChange={(e) => setSettings({...settings, sequenceDigits: parseInt(e.target.value) || 1})}
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1.5"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden">
            {/* 注意事項 (Moved above the Preview) */}
            <section className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-4 shadow-sm">
              <div className="bg-orange-500 text-white p-2 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-orange-900">注意事項</h3>
                <p className="text-xs text-orange-800/80 mt-1 leading-relaxed">
                  移動先に同名のファイルがある場合、自動的に上書きされます。必要に応じて事前のバックアップを行ってください。
                </p>
              </div>
            </section>

            {/* 処理プレビュー */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <h2 className="font-bold text-slate-800">処理プレビュー</h2>
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                    {files.length} 件
                  </span>
                </div>
                <button 
                  disabled={files.length === 0 || processing}
                  onClick={executeRenaming}
                  className={`
                    flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-all
                    ${files.length > 0 && !processing 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                  `}
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      実行中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      一括リネーム & 移動
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">元のファイル名</th>
                      <th className="px-2 py-3"></th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">変更後のファイル名</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">サイズ / 作成日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {files.length > 0 ? previews.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded group-hover:bg-white transition-colors">
                              <FileText className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{item.originalName}.{item.extension}</p>
                              <p className="text-[10px] text-slate-400">...{item.originalName.slice(-10)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4">
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-blue-600 bg-blue-50/50 px-2 py-1 rounded inline-block border border-blue-100">
                            {item.newName}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[200px]" title={item.targetPath}>
                            {item.targetPath}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-600 font-medium">{formatSize(item.size)}</p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                            <Clock className="w-3 h-3" />
                            {item.createdAt}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                          {logs.length > 0 ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="bg-green-100 p-4 rounded-full">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-slate-800">すべての処理が完了しました</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                  {logs.length}件のファイルが移動先に保存されました。
                                </p>
                              </div>
                              <button 
                                onClick={() => setShowLog(true)}
                                className="mt-4 px-4 py-2 bg-slate-800 text-white rounded text-sm font-bold hover:bg-slate-900 transition-colors"
                              >
                                実行ログを表示
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-slate-400 gap-2">
                              <div className="p-4 bg-slate-50 rounded-full mb-2">
                                <FolderOpen className="w-8 h-8 opacity-30" />
                              </div>
                              <p className="text-sm">整理対象のファイルがありません</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>

      {showLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <h2 className="text-xl font-bold text-slate-900">実行ログ - 処理結果</h2>
              </div>
              <button 
                onClick={() => setShowLog(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors">
                    <div className="mt-1 bg-green-50 text-green-600 p-1.5 rounded">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Rename Success</span>
                        <span className="text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">移動完了</span>
                      </div>
                      <div className="grid grid-cols-2 gap-8 items-center">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold mb-1">Before</p>
                          <p className="text-sm font-medium text-slate-600 truncate">{log.originalName}.{log.extension}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold mb-1">After</p>
                          <p className="text-sm font-bold text-blue-700 truncate">{log.newName}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-mono">{log.targetPath}</p>
                        <p className="text-[10px] font-bold text-slate-500">{formatSize(log.size)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setShowLog(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-100 py-3 px-6 text-center border-t border-slate-200">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Smart File Organizer Pro v1.0.4 • Local Environment Only • Security Compliant
        </p>
      </footer>
    </div>
  );
};

export default App;
