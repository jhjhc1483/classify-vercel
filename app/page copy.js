"use client";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [content, setContent] = useState("");
  const [data, setData] = useState(null);
  const [editableKeywords, setEditableKeywords] = useState([]);
  const [historyId, setHistoryId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualDept, setManualDept] = useState("");

  const handleAnalyze = async () => {
    if (!content) return alert("내용을 입력해주세요.");
    setLoading(true);
    setData(null);
    setHistoryId(null);

    try {
      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const result = await response.json();
      
      if (result.error) {
        alert("분석 실패: " + result.error);
      } else {
        setData(result);
        setEditableKeywords(result.keywords);
        setHistoryId(result.history_id);
      }
    } catch (error) {
      alert("서버 연결 오류!");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKeywords = async () => {
    if (!historyId) return;
    await fetch("http://localhost:5000/update_history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: historyId, keywords: editableKeywords }),
    });
    alert("키워드가 저장되었습니다.");
  };

  // ★ 재학습 요청 시 ID 함께 전송
  const handleTrain = async (targetDept) => {
    if (!confirm(`'${targetDept}'(을)를 정답 부서로 확정하고 학습시키겠습니까?`)) return;
    
    try {
      await fetch("http://localhost:5000/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: historyId,      // ★ 중요: 현재 분석 결과의 ID
          content: content, 
          department: targetDept 
        }),
      });
      alert(`학습 완료! 이력의 최종 부서가 '${targetDept}'(으)로 변경되었습니다.`);
    } catch (error) { alert("저장 실패"); }
  };

  const handleKeywordChange = (index, value) => {
    const newKeywords = [...editableKeywords];
    newKeywords[index] = value;
    setEditableKeywords(newKeywords);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        
        <div className="bg-slate-800 p-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🇰🇷 국회요구자료 AI 분류기</h1>
            <p className="text-slate-300 text-sm mt-1">AI 분석 + 이력 자동 저장 시스템</p>
          </div>
          <Link href="/history">
            <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm font-bold border border-slate-600 transition">
              📜 이력 조회
            </button>
          </Link>
        </div>

        <div className="p-6">
          <label className="block text-slate-700 font-bold mb-2">요구자료 원문</label>
          <textarea
            className="w-full h-32 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-black bg-slate-50"
            placeholder="요구내용을 입력하세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`w-full mt-4 py-3 rounded-lg font-bold text-white transition shadow-md ${
              loading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "분석 중..." : "분석 시작"}
          </button>

          {data && (
            <div className="mt-8 space-y-6 animate-fade-in-up">
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                <h2 className="text-blue-800 font-bold mb-3">📄 핵심 요약</h2>
                <div className="text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                  {data.summary}
                </div>
                
                <div className="mt-4 pt-4 border-t border-blue-100">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-xs text-slate-500">키워드 수정 및 저장:</p>
                    <button onClick={handleSaveKeywords} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 font-bold">저장 💾</button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {editableKeywords.map((kw, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={kw}
                        onChange={(e) => handleKeywordChange(idx, e.target.value)}
                        className="px-3 py-1 bg-white text-blue-600 text-sm font-bold rounded-full border border-blue-200 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none w-24 text-center"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-slate-800 font-bold mb-4">🏢 담당 부서 추천</h2>
                <div className="grid gap-4">
                  {data.predictions.map((item, index) => (
                    <div key={index} className={`p-4 rounded-lg border flex items-center justify-between ${index === 0 ? "bg-green-50 border-green-200 ring-1 ring-green-400" : "bg-white"}`}>
                      <div>
                        <span className={`inline-block w-6 h-6 text-center rounded-full mr-2 font-bold ${index===0?"bg-green-500 text-white":"bg-slate-200 text-slate-500"}`}>{item.rank}</span>
                        <span className="font-bold text-slate-800">{item.department}</span>
                        <p className="text-xs text-slate-500 mt-1 ml-8">{item.reason}</p>
                      </div>
                      <button onClick={() => handleTrain(item.department)} className="text-xs bg-white border px-3 py-1 rounded hover:bg-slate-100 text-slate-700">이게 정답 ✅</button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-200 flex gap-2">
                  <input type="text" placeholder="직접 부서 입력" value={manualDept} onChange={(e)=>setManualDept(e.target.value)} className="flex-grow p-2 border rounded text-black"/>
                  <button onClick={()=>{if(manualDept) handleTrain(manualDept)}} className="bg-slate-700 text-white px-4 rounded text-sm">학습</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}