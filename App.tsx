import React, { useState, useRef } from 'react';
import CanvasEditor from './components/CanvasEditor';
import LoadingOverlay from './components/LoadingOverlay';
import { removeWatermark } from './services/geminiService';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalMimeType, setOriginalMimeType] = useState<string>('image/png');
  const [brushSize, setBrushSize] = useState<number>(30);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [exportTrigger, setExportTrigger] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOriginalMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageSrc(event.target.result);
        setProcessedImage(null);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartProcessing = () => {
    // Increment trigger to tell CanvasEditor to generate the mask
    setExportTrigger(prev => prev + 1);
  };

  const handleMaskReady = async (maskBase64: string) => {
    if (!imageSrc) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const resultImage = await removeWatermark(imageSrc, maskBase64, originalMimeType);
      setProcessedImage(resultImage);
    } catch (error: any) {
      console.error(error);
      // Display the actual error message if available, otherwise a helpful default
      let msg = "处理失败，请重试。";
      if (error.message) {
        if (error.message.includes("403") || error.message.includes("API key")) {
          msg = "API Key 无效或权限不足。请检查 Key 是否正确。";
        } else if (error.message.includes("429") || error.message.includes("quota")) {
          msg = "API 配额已用完 (429)。请稍后重试。";
        } else if (error.message.includes("500") || error.message.includes("503")) {
          msg = "服务器繁忙，请稍后重试。";
        } else {
           msg = `处理失败: ${error.message}`;
        }
      }
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `cleaned_image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setImageSrc(null);
    setProcessedImage(null);
    setExportTrigger(0);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              智能魔法橡皮擦
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <a href="https://github.com/google/generative-ai-js" target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-slate-300 transition-colors hidden sm:block">
               Powered by Gemini 2.5 Flash
             </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Step 1: Upload (Only show if no image selected) */}
        {!imageSrc && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
            <div className="w-full max-w-2xl">
              <label 
                htmlFor="file-upload" 
                className="group relative flex flex-col items-center justify-center w-full h-80 rounded-3xl border-2 border-dashed border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
                  <div className="w-20 h-20 mb-4 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-slate-700 group-hover:border-blue-500/30">
                    <svg className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="mb-2 text-xl font-semibold text-slate-200">点击上传图片</p>
                  <p className="text-sm text-slate-500">支持 JPG, PNG, WEBP (原画质处理)</p>
                </div>
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </label>
              <div className="mt-8 text-center text-slate-500 text-sm">
                <p>💡 提示: 上传后涂抹水印区域，AI 将自动识别并填充背景。</p>
              </div>
            </div>
          </div>
        )}

        {/* Editor Interface */}
        {imageSrc && (
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[600px]">
            
            {/* Left: Toolbar */}
            <div className="lg:w-64 flex flex-col gap-4 shrink-0 order-2 lg:order-1">
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-xl flex flex-col gap-6">
                <div>
                   <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">工具箱</h3>
                   
                   {/* Brush Size Slider */}
                   <div className="mb-6">
                     <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-400">画笔大小</span>
                        <span className="text-sm text-blue-400 font-mono">{brushSize}px</span>
                     </div>
                     <input 
                       type="range" 
                       min="5" 
                       max="100" 
                       value={brushSize} 
                       onChange={(e) => setBrushSize(parseInt(e.target.value))}
                       className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                       disabled={isProcessing || !!processedImage}
                     />
                   </div>

                   {/* Instructions */}
                   <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                      <p className="text-xs text-blue-200 leading-relaxed">
                        {!processedImage ? "👉 用红色画笔涂抹水印或要移除的对象，然后点击“开始去水印”。" : "✅ 处理完成！如果满意请下载，或者重新上传。"}
                      </p>
                   </div>
                </div>

                <div className="flex flex-col gap-3 mt-auto">
                  {!processedImage ? (
                    <button
                      onClick={handleStartProcessing}
                      disabled={isProcessing}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      {isProcessing ? '处理中...' : '开始去水印'}
                    </button>
                  ) : (
                    <button
                      onClick={handleDownload}
                      className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      下载结果
                    </button>
                  )}

                  <button
                    onClick={handleReset}
                    className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl transition-all"
                  >
                    重置 / 上传新图
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Canvas Area */}
            <div className="flex-1 bg-slate-950/50 rounded-2xl border border-slate-800 p-1 relative overflow-hidden order-1 lg:order-2 flex flex-col">
               {errorMsg && (
                 <div className="absolute top-4 left-4 right-4 z-50 animate-fade-in-down">
                    <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-3">
                       <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                       </svg>
                       <span className="text-sm font-medium break-all">{errorMsg}</span>
                       <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-300 hover:text-white">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                         </svg>
                       </button>
                    </div>
                 </div>
               )}

               {/* Before/After Toggle could be added here for UX, for now just replace */}
               <div className="relative w-full h-full">
                  {processedImage ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      {/* Using an img tag for result to allow easy right-click save and native scaling */}
                      <img 
                        src={processedImage} 
                        alt="Processed" 
                        className="max-w-full max-h-full object-contain shadow-2xl"
                      />
                      <div className="absolute top-4 left-4 bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                        处理完成 (已去水印)
                      </div>
                    </div>
                  ) : (
                    <CanvasEditor 
                      imageSrc={imageSrc}
                      brushSize={brushSize}
                      isProcessing={isProcessing}
                      onMaskReady={handleMaskReady}
                      triggerExport={exportTrigger}
                    />
                  )}
                  
                  {isProcessing && <LoadingOverlay message="AI正在消除选定区域..." />}
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;