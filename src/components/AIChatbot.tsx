import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, ArrowUpRight, HelpCircle, AlertCircle } from "lucide-react";
import { PrimaryButton, CardView } from "./CommonDesignSystem";

interface Source {
  title: string;
  url: string;
  similarity: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  createdAt: string;
}

interface AIChatbotProps {
  userRole: string;
  onSelectBrand?: (brandId: string) => void;
  className?: string;
}

const FAQS_SUGGESTIONS = [
  "블루보틀과 마지막 제안 합의 정산 주기 조건은?",
  "샐러디의 가맹 정산 모바일화 피드백은?",
  "무인양품 코리아 카테고리와 매장 수 규모는?",
  "폴바셋 코리아 예상 월평균 매출 규모는?"
];

export default function AIChatbot({ userRole, onSelectBrand, className = "" }: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      role: "assistant",
      text: "안녕하세요! 사내 **AI RAG(검색 증강 생성) 세일즈 비서**입니다. 누적된 거래처 회의록, 미팅 요약록 및 가맹 수급 단계 이력들을 기반으로 보안 권한에 알맞게 실시간 답변해 드립니다.\n\n궁금하신 내용을 입력하시거나 아래 추천 키워드를 직접 격발해 보세요!",
      createdAt: new Date().toISOString()
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to chat bottom
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: queryText,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/rag-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          userRole
        })
      });

      if (!response.ok) {
        throw new Error(`RAG 대화 응답 실패 (HTTP ${response.status})`);
      }

      const resData = await response.json();
      
      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: resData.answer || "답변 수급에 실패했습니다.",
        sources: resData.sources || [],
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("AI chat assistant failure:", err);
      setErrorMsg("RAG 질의 전송에 일시적인 지연이 발생했거나 백엔드 오프라인 상태입니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const parseMarkdownBold = (txt: string) => {
    // Simple custom regex to replace **text** with rich HTML bolding for high readability
    const parts = txt.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const handleSourceRedirect = (sourceUrl: string) => {
    if (onSelectBrand && sourceUrl.startsWith("#brand-")) {
      const brandId = sourceUrl.replace("#brand-", "");
      onSelectBrand(brandId);
    }
  };

  return (
    <CardView 
      className={`flex flex-col h-[520px] bg-slate-50/50 relative overflow-hidden backdrop-blur-sm ${className}`}
      header={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/50 px-2.5 py-0.5 rounded-full shrink-0 border border-indigo-100/50">
                Vector Similarity Engine
              </span>
              <h3 className="text-xs font-black text-slate-900 mt-0.5 flex items-center gap-1">
                AI RAG 사내 지식 어시스턴트
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-150 px-2 py-0.5 rounded-md">
            권한: {userRole}
          </span>
        </div>
      }
    >
      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[88%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
          >
            <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 border shadow-4xs ${
              msg.role === "user" ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-indigo-50 border-indigo-100 text-indigo-600"
            }`}>
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div className="space-y-2">
              <div
                className={`p-3.5 px-4 rounded-3xl text-[11px] leading-relaxed break-words whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#4F46E5] text-white font-semibold rounded-tr-none shadow-3xs"
                    : "bg-white border border-slate-100 rounded-tl-none text-slate-800 shadow-4xs"
                }`}
              >
                {msg.role === "user" ? msg.text : parseMarkdownBold(msg.text)}
              </div>

              {/* RAG Retrieved Grounded References Sources */}
              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div className="p-2.5 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl space-y-1.5 max-w-full animate-fadeIn">
                  <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">
                    🔍 pgvector 검색 랭크 정합 참조:
                  </span>
                  <div className="space-y-1">
                    {msg.sources.map((src, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSourceRedirect(src.url)}
                        className="w-full flex items-center justify-between text-left p-1.5 px-2 bg-white hover:bg-indigo-50 rounded-xl border border-indigo-100/30 transition-all text-[10px] group cursor-pointer"
                      >
                        <span className="font-extrabold text-indigo-900 truncate pr-2">
                          📌 {src.title}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded">
                            정합도 {(src.similarity * 100).toFixed(1)}%
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 mr-auto max-w-[80%] items-center animate-pulse">
            <div className="p-2 rounded-full h-8 w-8 bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="p-3.5 py-3 rounded-2xl rounded-tl-none bg-indigo-50/40 text-[10px] text-indigo-900 font-extrabold">
              AI가 사내 PostgreSQL(pgvector) 데이터베이스에서 세일즈 이력을 유사도 탐색 중입니다...
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-[10px] text-rose-800 font-black flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Suggested FAQs Area */}
      <div className="border-t border-slate-100/60 pt-3 mt-3">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
          💡 RAG 추천 챗 키워드 지문:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {FAQS_SUGGESTIONS.map((faq, fIdx) => (
            <button
              key={fIdx}
              onClick={() => handleSendMessage(faq)}
              className="text-[10px] font-extrabold text-slate-600 bg-white border border-slate-200/90 hover:bg-indigo-50/80 hover:border-indigo-250 hover:text-indigo-600 hover:shadow-5xs hover:scale-[1.01] active:scale-[0.98] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer text-left duration-250"
            >
              # {faq}
            </button>
          ))}
        </div>
      </div>

      {/* Text input area */}
      <div className="border-t border-slate-100/60 pt-3.5 mt-3 flex items-center gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSendMessage(inputVal);
            }
          }}
          disabled={isLoading}
          placeholder="가맹사 수수료 조건, 정산 이력을 RAG로 물어보세요..."
          className="flex-1 bg-[#EEF2FF]/20 border border-indigo-150/80 hover:border-indigo-250 focus:bg-white text-indigo-950 placeholder-indigo-400 px-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-150 disabled:opacity-60 transition-all font-sans"
        />
        <PrimaryButton
          onClick={() => handleSendMessage(inputVal)}
          loading={isLoading}
          disabled={!inputVal.trim()}
          variant="indigo"
          size="sm"
          className="h-[36px] bg-[#EEF2FF] border border-indigo-150 hover:bg-[#E0E7FF]/80 focus:ring-2 focus:ring-indigo-200 text-indigo-700 hover:scale-[1.01] active:scale-[0.98] transition-all"
        >
          <Send className="w-3 h-3 text-indigo-550" />
          <span>질문</span>
        </PrimaryButton>
      </div>
    </CardView>
  );
}
