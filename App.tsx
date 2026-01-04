
import React, { useState, useMemo } from 'react';
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
  Info,
  ShieldCheck,
  Loader2,
  Copy
} from 'lucide-react';
import { RulePart, FileItem, PreviewItem, AppSettings, RuleType } from './types';
import { formatSize, getTodayStr } from './utils/formatters';
import RuleChip from './components/RuleChip';

const App: React.FC = () => {
  // Handles for real directory access
  const [sourceHandle, setSourceHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [targetHandle, setTargetHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const [settings, setSettings] = useState<AppSettings>({
    sourcePath: '',
    targetPath: '',
    delimiter: '_',
    sequenceDigits: 2,
  });

  const [rules, setRules] = useState<RulePart[]>([
    { id: 'r1', type: 'date', enabled: true },
    { id: 'r2', type: 'string', value: '事務書類', enabled: true },
    { id: 'r3', type: 'sequence', enabled: true },
  ]);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<PreviewItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Helper to refresh file list from source folder
  const refreshFileList = async (handle: FileSystemDirectoryHandle) => {
    const fileList: FileItem[] = [];
    for await (const entry of (handle as any).values()) {
      if (entry.kind === 'file') {
        const file = await (entry as any).getFile();
        const lastDotIndex = file.name.lastIndexOf('.');
        fileList.push({
          id: Math.random().toString(36).substr(2, 9),
          originalName: lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name,
          extension: lastDotIndex !== -1 ? file.name.substring(lastDotIndex + 1) : '',
          size: file.size,
          createdAt: new Date(file.lastModified).toISOString().split('T')[0]
        });
      }
    }
    setFiles(fileList);
  };

  const pickSourceFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'read' // Read-only is enough for source now
      });
      setSourceHandle(handle);
      setSettings(s => ({ ...s, sourcePath: handle.name }));
      await refreshFileList(handle);
    } catch (err) {
      console.error('Source folder selection failed', err);
    }
  };

  const pickTargetFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      setTargetHandle(handle);
      setSettings(s => ({ ...s, targetPath: handle.name }));
    } catch (err) {
      console.error('Target folder selection failed', err);
    }
  };

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
        targetPath: `${settings.targetPath}/${newBaseName}.${file.extension}`,
        status: 'pending' as const,
      };
    });
  }, [files, rules, settings]);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
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

  const executeRenaming = async () => {
    if (!sourceHandle || !targetHandle) {
      alert("フォルダ設定が完了していません。");
      return;
    }

    setProcessing(true);
    const results: PreviewItem[] = [];

    try {
      const sourcePermission = await (sourceHandle as any).queryPermission({ mode: 'read' });
      if (sourcePermission !== 'granted') {
        await (sourceHandle as any).requestPermission({ mode: 'read' });
      }
      
      const targetPermission = await (targetHandle as any).queryPermission({ mode: 'readwrite' });
      if (targetPermission !== 'granted') {
        await (targetHandle as any).requestPermission({ mode: 'readwrite' });
      }

      for (const item of previews) {
        try {
          // 1. Original file handle from source
          const originalFileName = `${item.originalName}.${item.extension}`;
          const fileHandle = await sourceHandle.getFileHandle(originalFileName);
          const fileData = await fileHandle.getFile();

          // 2. Create new file handle in target
          const newFileHandle = await targetHandle.getFileHandle(item.newName, { create: true });
          
          // 3. Write data to new file (Copy process)
          const writable = await (newFileHandle as any).createWritable();
          await writable.write(fileData);
          await writable.close();

          // NOTE: We no longer remove the original file from the source handle.
          // This satisfies the requirement to not change the source folder content.

          results.push({
            ...item,
            status: 'success',
            message: 'コピー完了'
          });
        } catch (err: any) {
          console.error(`Error processing ${item.originalName}:`, err);
          results.push({
            ...item,
            status: 'error',
            message: err.message || 'エラーが発生しました'
          });
        }
      }

      setLogs(results);
      setShowLog(true);
      // We don't strictly need to refresh source since nothing changed, 
      // but it's good practice in case the folder was modified externally.
      await refreshFileList(sourceHandle);

    } catch (err: any) {
      alert(`処理に失敗しました: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-md shadow-blue-100">
              <RefreshCcw className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">スマート・ファイル整理 Pro</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-70">Automated Copy & Renaming</p>
            </div>
          </div>
          <button 
            onClick={() => {setFiles([]); setLogs([]); setShowLog(false); setSourceHandle(null); setTargetHandle(null); setSettings(s => ({...s, sourcePath: '', targetPath: ''}))}}
            className="text-sm font-bold text-slate-500 hover:text-red-500 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-red-50 transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            リセット
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6 text-slate-800 border-b border-slate-100 pb-3">
                <Settings className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold">フォルダ設定</h2>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">ソース（元のフォルダ・変更なし）</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        readOnly 
                        placeholder="フォルダを選択してください..."
                        value={settings.sourcePath}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-9 py-2.5 text-slate-600 focus:outline-none transition-all focus:border-blue-300"
                      />
                      {sourceHandle && <ShieldCheck className="w-4 h-4 text-green-500 absolute right-3 top-3" />}
                    </div>
                    <button 
                      onClick={pickSourceFolder}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                      title="フォルダを選択"
                    >
                      <FolderOpen className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">ターゲット（リネーム後の保存先）</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        readOnly 
                        placeholder="整理先を選択してください..."
                        value={settings.targetPath}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-9 py-2.5 text-slate-600 focus:outline-none transition-all focus:border-blue-300"
                      />
                      {targetHandle && <ShieldCheck className="w-4 h-4 text-green-500 absolute right-3 top-3" />}
                    </div>
                    <button 
                      onClick={pickTargetFolder}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                      title="フォルダを選択"
                    >
                      <FolderOpen className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Play className="w-5 h-5 text-green-500" />
                  <h2 className="font-bold">命名ルールの構築</h2>
                </div>
                <Info className="w-4 h-4 text-slate-300 cursor-help" />
              </div>

              <div className="space-y-3 mb-6 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
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
                    onDragEnd={() => setDraggedIndex(null)}
                  />
                ))}
              </div>

              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => addRule('date')} className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-[11px] font-bold text-slate-600 hover:text-blue-600 transition-all active:scale-95"><Plus className="w-4 h-4" /> 日付</button>
                  <button onClick={() => addRule('sequence')} className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-[11px] font-bold text-slate-600 hover:text-blue-600 transition-all active:scale-95"><Plus className="w-4 h-4" /> 連番</button>
                  <button onClick={() => addRule('string')} className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-[11px] font-bold text-slate-600 hover:text-blue-600 transition-all active:scale-95"><Plus className="w-4 h-4" /> 固定文字</button>
                </div>

                <div className="flex gap-4 items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tight">区切り文字</label>
                    <select 
                      value={settings.delimiter}
                      onChange={(e) => setSettings({...settings, delimiter: e.target.value})}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="_">_ (アンダースコア)</option>
                      <option value="-">- (ハイフン)</option>
                      <option value=" "> (スペース)</option>
                      <option value="">なし</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tight">連番の桁数</label>
                    <input 
                      type="number"
                      min="1"
                      max="5"
                      value={settings.sequenceDigits}
                      onChange={(e) => setSettings({...settings, sequenceDigits: parseInt(e.target.value) || 1})}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden">
            <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
              <div className="bg-blue-500 text-white p-2 rounded-xl shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-900">お知らせ</h3>
                <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                  実行するとファイルはリネームされ、ターゲットフォルダへ<strong className="text-blue-950 underline underline-offset-2">コピー</strong>されます。ソース（元のフォルダ）の中身は変更されません。
                </p>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h2 className="font-bold text-slate-800">処理プレビュー</h2>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full ml-2">
                    {files.length} ファイル待機中
                  </span>
                </div>
                <button 
                  disabled={files.length === 0 || processing || !targetHandle}
                  onClick={executeRenaming}
                  className={`
                    flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all
                    ${files.length > 0 && !processing && targetHandle
                      ? 'bg-slate-900 hover:bg-black text-white active:scale-95 shadow-slate-200' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}
                  `}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      一括リネーム ＆ コピー実行
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">元の名前</th>
                      <th className="px-2 py-4 text-center">
                        <ChevronRight className="w-4 h-4 text-slate-200 mx-auto" />
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">新しい名前</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">サイズ / 日付</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {files.length > 0 ? previews.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg">
                              <FileText className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-600 truncate max-w-[200px]">{item.originalName}.{item.extension}</p>
                          </div>
                        </td>
                        <td className="px-2 py-5">
                          <ChevronRight className="w-4 h-4 text-blue-300 mx-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-blue-600 bg-blue-50/30 border border-blue-100 px-3 py-1.5 rounded-lg inline-block self-start">
                              {item.newName}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                              <FolderOpen className="w-3 h-3" /> {item.targetPath}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <p className="text-xs text-slate-700 font-bold">{formatSize(item.size)}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1.5 font-medium">
                            <Clock className="w-3 h-3" />
                            {item.createdAt}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-24 text-center">
                          {logs.length > 0 ? (
                            <div className="flex flex-col items-center gap-4">
                              <div className="bg-green-100 p-5 rounded-full shadow-inner animate-bounce">
                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-900">コピー整理が完了しました！</h3>
                                <p className="text-sm text-slate-500">
                                  {logs.filter(l => l.status === 'success').length} 件のファイルをターゲットへ出力しました。
                                </p>
                              </div>
                              <button 
                                onClick={() => setShowLog(true)} 
                                className="mt-4 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg"
                              >
                                詳細ログを確認する
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-slate-400 gap-4 opacity-60">
                              <div className="p-6 bg-slate-50 rounded-full border border-slate-100">
                                <FolderOpen className="w-12 h-12 stroke-[1.5]" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-500">整理対象のファイルが見つかりません</p>
                                <p className="text-xs">まずは「ソースフォルダ」から読み込むフォルダを選んでください</p>
                              </div>
                              <button 
                                onClick={pickSourceFolder} 
                                className="mt-2 text-xs text-blue-600 font-bold px-4 py-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                              >
                                フォルダを選択
                              </button>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-7 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="bg-green-50 p-2 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">処理レポート</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Summary of automated copy actions</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLog(false)} 
                className="text-slate-300 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-all active:scale-90"
              >
                <Plus className="w-8 h-8 rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-8 bg-slate-50/30 custom-scrollbar">
              <div className="grid gap-4">
                {logs.map((log) => (
                  <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase">Success</span>
                        ) : (
                          <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase">Error</span>
                        )}
                        <span className="text-[10px] font-bold text-slate-300">ID: {log.id}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {log.createdAt}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Source (Unchanged)</p>
                        <p className="text-sm font-medium text-slate-600 truncate">{log.originalName}.{log.extension}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-200 hidden md:block" />
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Target (Copied & Renamed)</p>
                        <p className="text-sm font-black text-blue-700 truncate">{log.newName}</p>
                      </div>
                    </div>
                    
                    {log.message && log.status === 'error' && (
                      <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {log.message}
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 truncate max-w-[80%]">
                        <span className="opacity-50">Target Path:</span> {log.targetPath}
                      </p>
                      <p className="text-[10px] font-black text-slate-500">{formatSize(log.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-7 border-t border-slate-100 bg-white flex justify-end">
              <button 
                onClick={() => setShowLog(false)} 
                className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                レポートを閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-50 py-3 px-6 text-center border-t border-slate-200">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Smart File Organizer Pro • Finalized v1.3.0 • Copy & Rename Logic Active (Safe Mode)
        </p>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;
