import React from 'react';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg">
      <div className="relative w-20 h-20 mb-4">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500/30 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
      </div>
      <p className="text-blue-100 text-lg font-medium animate-pulse">{message}</p>
      <p className="text-slate-400 text-sm mt-2">AI 正在进行像素级修复，请稍候...</p>
    </div>
  );
};

export default LoadingOverlay;