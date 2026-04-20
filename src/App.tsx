import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout, OperationType, handleFirestoreError } from './lib/firebase';
import { CodeEditor } from './components/CodeEditor';
import { LivePreview } from './components/LivePreview';
import { AIFeedback } from './components/AIFeedback';
import { analyzeCode, AnalysisResult } from './services/geminiService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { cn } from './lib/utils';
import { 
  Play, 
  Sparkles, 
  LogOut, 
  Layout, 
  History, 
  Settings, 
  GraduationCap, 
  Code2, 
  Monitor,
  CheckCircle2,
  Terminal,
  BookOpen,
  FileCode,
  GripVertical,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [html, setHtml] = useState<string>('<h1>Chào em!</h1>\n<p>Hãy thử viết mã HTML vào đây xem kết quả nhé.</p>');
  const [css, setCss] = useState<string>('h1 {\n  color: #3b82f6;\n  font-size: 2.5rem;\n}\n\np {\n  color: #4b5563;\n  line-height: 1.6;\n}');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'progress'>('editor');
  const [viewMode, setViewMode] = useState<'split' | 'code' | 'preview'>('split');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [editorWidth, setEditorWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX - 240; // Subtract sidebar width
      if (newWidth > 300 && newWidth < window.innerWidth - 450) {
        setEditorWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  const EXAMPLE_HEADER = {
    html: `<header class="navbar">
  <div class="logo">MyBrand</div>
  <nav>
    <ul class="nav-links">
      <li><a href="#">Trang chủ</a></li>
      <li><a href="#">Sản phẩm</a></li>
      <li><a href="#">Dịch vụ</a></li>
      <li><a href="#">Liên hệ</a></li>
    </ul>
  </nav>
  <button class="cta">Bắt đầu</button>
</header>`,
    css: `.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 5%;
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #3b82f6;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 2rem;
}

.nav-links a {
  text-decoration: none;
  color: #4b5563;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: #3b82f6;
}

.cta {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}`
  };

  const loadExample = () => {
    if (html.trim() !== '' && html !== '<h1>Chào em!</h1>\n<p>Hãy thử viết mã HTML vào đây xem kết quả nhé.</p>') {
      if (!window.confirm("Em có muốn tải mã ví dụ mới không? Mã hiện tại sẽ bị thay đổi đấy.")) {
        return;
      }
    }
    setHtml(EXAMPLE_HEADER.html);
    setCss(EXAMPLE_HEADER.css);
    setAnalysis(null);
  };

  const clearAll = () => {
    if (window.confirm("Em có muốn xóa hết toàn bộ mã nguồn không?")) {
        setHtml('');
        setCss('');
        setAnalysis(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      
      if (u) {
        // Sync user profile
        const userRef = doc(db, 'users', u.uid);
        setDoc(userRef, {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          role: 'student', // Default role for new users
          lastLogin: serverTimestamp()
        }, { merge: true }).catch(err => {
          console.error("Failed to sync user profile", err);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Clear analysis when code is cleared
  useEffect(() => {
    if (html.trim() === '' && css.trim() === '') {
      setAnalysis(null);
    }
  }, [html, css]);

  const handleAnalyze = async () => {
    if (!user) {
        alert("Em hãy đăng nhập bằng tài khoản Google để AI có thể giúp em nhé!");
        return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeCode(html, css);
      setAnalysis(result);
      
      // Log session to Firestore
      const sessionPath = 'sessions';
      let sessionId = '';
      try {
        const sessionDoc = await addDoc(collection(db, sessionPath), {
          userId: user.uid,
          htmlCode: html,
          cssCode: css,
          errorsFoundCount: result.errors.length,
          status: 'completed',
          startTime: serverTimestamp(),
          timestamp: serverTimestamp()
        });
        sessionId = sessionDoc.id;
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, sessionPath);
      }

      // Log specific errors
      if (result.errors.length > 0) {
          const logsPath = 'error_logs';
          for (const err of result.errors) {
            try {
                await addDoc(collection(db, logsPath), {
                    sessionId,
                    userId: user.uid,
                    type: err.type,
                    message: err.message,
                    suggestion: err.suggestion,
                    context: err.context,
                    timestamp: serverTimestamp()
                });
            } catch (e) {
                console.error("Failed to log individual error", e);
            }
          }
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Sparkles className="w-12 h-12 text-blue-500 animate-bounce" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl"
        >
            <div className="bg-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200">
                <GraduationCap className="text-white w-12 h-12" />
            </div>
            <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Hỗ trợ Kiểm tra Lỗi HTML & CSS</h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Chào mừng em đến với không gian thực hành lập trình thông minh. 
              Hãy đăng nhập để bắt đầu hành trình chinh phục mã nguồn cùng thầy giáo AI nhé!
            </p>
            <button
                onClick={() => loginWithGoogle()}
                className="group relative flex items-center justify-center gap-3 bg-white border-2 border-gray-200 px-8 py-4 rounded-xl font-bold text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md mx-auto"
            >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Đăng nhập bằng Google để Bắt đầu
            </button>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { icon: Code2, label: "Trình soạn thảo tối ưu", desc: "Dễ dàng viết HTML/CSS" },
                    { icon: Sparkles, label: "AI Phân tích thông minh", desc: "Phát hiện lỗi & gợi ý sửa" },
                    { icon: Layout, label: "Xem trước trực tiếp", desc: "Quan sát kết quả tức thì" }
                ].map((feature, i) => (
                    <div key={i} className="p-6 bg-white/50 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                        <feature.icon className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-800">{feature.label}</h3>
                        <p className="text-sm text-gray-500">{feature.desc}</p>
                    </div>
                ))}
            </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-full bg-app-bg">
        {/* Sidebar - Progress Tracking Module */}
        <aside className="w-[240px] bg-app-sidebar text-white flex flex-col p-6 shrink-0 border-r border-app-border z-20">
          <div className="mb-10">
            <div className="font-extrabold text-lg tracking-tight text-app-accent leading-tight">
              HTML & CSS <br /> STUDIO PRO
            </div>
          </div>
          
          <nav className="flex flex-col gap-1">
            {[
                { icon: Monitor, label: "Trình soạn thảo", id: 'editor' },
                { icon: History, label: "Lịch sử lỗi", id: 'progress' },
                { icon: Settings, label: "Cài đặt & Thư viện", id: 'settings' }
            ].map((item) => (
                <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={cn(
                        "flex items-center gap-3 px-0 py-3 text-sm transition-colors",
                        activeTab === item.id ? "text-white font-semibold" : "text-[#94A3B8] hover:text-white"
                    )}
                >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                </button>
            ))}
          </nav>

          <div className="mt-auto bg-white/5 p-4 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-app-text-dim mb-2 tracking-wider">Tiến độ khóa học</div>
            <div className="text-lg font-bold mb-1">65%</div>
            <div className="h-1.5 bg-[#334155] rounded-full overflow-hidden">
                <div className="h-full bg-app-accent w-[65%]" />
            </div>
            <div className="text-[10px] mt-2 text-[#94A3B8]">Tiếp theo: Flexbox Layout</div>
          </div>
        </aside>

        {/* Workspace */}
        <main 
            className="flex-1 grid grid-rows-[64px_1fr_auto] overflow-hidden transition-[grid-template-columns] duration-75"
            style={{ 
                gridTemplateColumns: activeTab === 'editor' ? `${editorWidth}px 4px 1fr` : '1fr',
                cursor: isResizing ? 'col-resize' : 'default'
            }}
        >
          {/* Header */}
          <header className={cn(
              "bg-app-card border-b border-app-border px-6 flex items-center justify-between z-10",
              activeTab === 'editor' ? "col-span-3" : "col-span-1"
          )}>
            <div className="flex gap-10">
                <div>
                   <div className="text-[11px] uppercase text-app-text-dim font-bold tracking-wider leading-none mb-1">Đang thực hiện</div>
                   <div className="text-sm font-semibold">{activeTab === 'editor' ? 'Bài tập 04: Header Navigation' : 'Báo cáo tiến độ cá nhân'}</div>
                </div>
                <div className="hidden sm:block">
                   <div className="text-[11px] uppercase text-app-text-dim font-bold tracking-wider leading-none mb-1">Điểm chất lượng</div>
                   <div className="text-sm font-semibold text-app-success">85/100</div>
                </div>
            </div>

            <div className="flex items-center gap-4">
               {activeTab === 'editor' && (
                 <>
                   <button
                      onClick={loadExample}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-app-text-dim hover:text-app-accent transition-colors border border-app-border rounded-lg bg-white/50"
                   >
                     <BookOpen className="w-4 h-4" />
                     Ví dụ
                   </button>
                   <button
                      onClick={clearAll}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-app-text-dim hover:text-app-error transition-colors border border-app-border rounded-lg bg-white/50"
                   >
                     <Trash2 className="w-4 h-4" />
                     Xóa hết
                   </button>
                   <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="btn-check flex items-center gap-2"
                  >
                    {isAnalyzing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Play className="w-4 h-4 fill-current shrink-0" />}
                    {isAnalyzing ? "Đang phân tích AI..." : "Kiểm tra & Phân tích AI"}
                  </button>
                 </>
               )}
               
               <div className="flex items-center gap-3 border-l pl-4 ml-2">
                   <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-8 h-8 rounded-full border border-app-border shadow-sm" alt="User" />
                   <button onClick={() => logout()} className="text-app-text-dim hover:text-app-error transition-colors">
                      <LogOut className="w-4 h-4" />
                   </button>
               </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'editor' ? (
              <>
                {/* Editor Section */}
                <section className="bg-app-code-bg p-0 overflow-hidden relative">
                   <div className="h-full grid grid-rows-2">
                        <CodeEditor value={html} onChange={setHtml} language="html" className="border-none rounded-none !pt-1 !bg-transparent" placeholder="Viết mã HTML của em vào đây..." />
                        <CodeEditor value={css} onChange={setCss} language="css" className="border-none rounded-none !pt-1 !bg-transparent border-t border-[#475569]" placeholder="Viết mã CSS của em vào đây..." />
                   </div>
                </section>

                {/* Preview Section */}
                <div 
                    onMouseDown={startResizing}
                    className={cn(
                        "w-full bg-app-border hover:bg-app-accent cursor-col-resize transition-colors flex items-center justify-center group relative",
                        isResizing && "bg-app-accent"
                    )}
                >
                    <div className="w-4 h-8 rounded-full bg-white border border-app-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute">
                        <GripVertical className="w-3 h-3 text-app-text-dim" />
                    </div>
                </div>

                <section className="bg-white flex flex-col overflow-hidden relative">
                    {/* Ghost overlay to prevent iframe from capturing events while resizing */}
                    {isResizing && <div className="absolute inset-0 z-50 cursor-col-resize" />}
                    <div className="bg-app-bg px-4 py-2 text-[11px] font-bold uppercase text-app-text-dim tracking-wider border-b border-app-border flex justify-between items-center">
                        <span>Trình xem trước kết quả trực tiếp</span>
                    </div>
                    <div className="flex-1">
                        <LivePreview html={html} css={css} />
                    </div>
                </section>

                {/* Feedback Section */}
                {(analysis || isAnalyzing) && (
                  <section className="col-span-3 bg-app-card border-t border-app-border p-6 overflow-hidden max-h-[350px]">
                      <div className="h-full flex flex-col">
                           <div className="flex items-center gap-2 mb-4">
                               <Sparkles className="w-4 h-4 text-app-accent" />
                               <h3 className="text-sm font-bold uppercase tracking-wider text-app-text-main">Phân tích chẩn đoán AI</h3>
                           </div>
                           <div className="flex-1 overflow-y-auto custom-scrollbar">
                               <AIFeedback result={analysis} loading={isAnalyzing} />
                           </div>
                      </div>
                  </section>
                )}
              </>
            ) : (
                <motion.div 
                    key="progress"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="col-span-2 row-span-2 p-10 overflow-y-auto bg-app-bg"
                >
                   {/* Progress Tab Content stays similar but updated to theme */}
                   <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-black mb-6">Lộ trình của em</h2>
                        <div className="grid grid-cols-3 gap-6 mb-10">
                            {[
                                { label: "Độ chính xác", val: "92%", color: "text-app-success" },
                                { label: "Thời gian sửa", val: "1p 45s", color: "text-app-text-main" },
                                { label: "Lộ trình", val: "A+", color: "text-app-accent" }
                            ].map((s, i) => (
                                <div key={i} className="bg-app-card p-6 rounded-xl border border-app-border shadow-sm">
                                    <div className="text-[11px] uppercase text-app-text-dim font-bold tracking-widest mb-2">{s.label}</div>
                                    <div className={cn("text-2xl font-bold", s.color)}>{s.val}</div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-app-card rounded-xl border border-app-border p-8 h-[300px] flex items-center justify-center text-app-text-dim italic">
                            Biểu đồ tiến độ đang đồng bộ dữ liệu...
                        </div>
                   </div>
                </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </ErrorBoundary>
  );
}
