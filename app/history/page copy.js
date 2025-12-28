"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // 이력 불러오기
  const fetchHistory = () => {
    fetch("http://localhost:5000/history")
      .then((res) => res.json())
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        alert("이력 로딩 실패");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // ★ 이력 초기화 함수
  const handleClearHistory = async () => {
    if (!confirm("정말 모든 이력을 삭제하시겠습니까? 복구할 수 없습니다.")) return;
    
    try {
      await fetch("http://localhost:5000/clear_history", { method: "POST" });
      setHistory([]); // 화면에서도 즉시 비움
      alert("초기화되었습니다.");
    } catch (e) {
      alert("삭제 실패");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">📜 분석 이력 관리</h1>
          <div className="flex gap-2">
            {/* 초기화 버튼 */}
            <button 
              onClick={handleClearHistory}
              className="px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 font-bold text-sm border border-red-200"
            >
              🗑️ 이력 초기화
            </button>
            <Link href="/">
              <button className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 font-bold text-sm">
                ← 메인으로
              </button>
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-slate-500">로딩 중...</p>
        ) : history.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-lg shadow text-slate-500">
            데이터가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                    {item.timestamp}
                  </span>
                  {/* ★ 최종 분류 부서 표시 */}
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    최종분류: {item.final_department}
                  </span>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-xs text-slate-500 font-bold mb-1">요구 내용</h3>
                  <p className="text-slate-800 text-sm line-clamp-2">{item.input}</p>
                </div>

                {item.keywords && item.keywords.length > 0 && (
                  <div className="mb-4 flex gap-2">
                    {item.keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded border border-slate-100">
                  <h3 className="text-xs text-slate-500 font-bold mb-1">AI 요약</h3>
                  <pre className="text-slate-700 text-sm whitespace-pre-wrap font-medium">
                    {item.summary}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}