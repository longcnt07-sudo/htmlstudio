import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AnalysisResult } from '../services/geminiService';
import { AlertCircle, CheckCircle, Lightbulb, Info, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface AIFeedbackProps {
  result: AnalysisResult | null;
  loading: boolean;
}

export const AIFeedback: React.FC<AIFeedbackProps> = ({ result, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <Sparkles className="w-10 h-10 text-app-accent animate-spin" />
        <p className="text-app-text-dim font-medium italic">Thầy giáo AI đang phân tích chẩn đoán...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
        <Info className="w-10 h-10 text-app-text-dim mb-2" />
        <p className="text-app-text-dim text-sm tracking-wide uppercase font-bold">Chưa có dữ liệu phân tích</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {result.errors.length > 0 ? (
        result.errors.map((err, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-app-border rounded-xl p-4 shadow-sm"
          >
            <div className={cn(
                "flex items-center gap-2 text-xs font-bold mb-3 uppercase tracking-wider",
                err.type === 'syntax' ? "text-app-error" : 
                err.type === 'optimization' ? "text-app-success" : "text-app-accent"
            )}>
                {err.type === 'syntax' ? '🚨 Lỗi Cú Pháp' : 
                 err.type === 'optimization' ? '💡 Tối Ưu Hóa' : '📘 Chẩn Đoán'}
            </div>
            
            <div className="mb-3">
                <div className="text-xs text-app-text-dim font-bold mb-1">Mã nguồn:</div>
                <div className="bg-app-bg px-2 py-1 rounded font-mono text-[10px] text-app-text-main border-l-2 border-app-error overflow-x-auto">
                    {err.context}
                </div>
            </div>

            <p className="text-sm font-semibold text-app-text-main mb-3 leading-snug">{err.message}</p>
            
            <div className="bg-slate-50 border border-dashed border-app-accent rounded-lg p-3">
                <div className="text-[10px] font-bold text-app-accent uppercase mb-1 tracking-widest">AI Gợi ý:</div>
                <p className="text-xs text-app-text-main italic">{err.suggestion}</p>
            </div>
          </motion.div>
        ))
      ) : (
        <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="md:col-span-3 bg-app-card border border-app-success/20 rounded-xl p-8 text-center"
        >
            <CheckCircle className="w-12 h-12 text-app-success mx-auto mb-3" />
            <h3 className="text-lg font-bold text-app-text-main mb-1 tracking-tight">Mã nguồn Hoàn hảo!</h3>
            <p className="text-app-text-dim text-sm">AI không phát hiện bất kỳ lỗi nào. Em đã làm rất tốt!</p>
        </motion.div>
      )}

      {/* Overview section based on explanation */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="md:col-span-3 bg-app-bg border border-app-border rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-app-accent" />
            <h4 className="text-xs font-bold uppercase text-app-text-main tracking-widest">Lời thầy AI dặn thêm:</h4>
        </div>
        <div className="text-sm text-app-text-dim leading-relaxed prose prose-slate prose-sm max-w-none">
            <ReactMarkdown>{result.explanation}</ReactMarkdown>
        </div>
      </motion.div>
    </div>
  );
};

// Helper inside the same file for simplicity if not exported from utils
