"use client";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid'; 

export default function Home() {
  // view 상태: MAIN | HISTORY | GUIDE
  const [view, setView] = useState("MAIN");
  
  // 입력 및 결과 상태
  const [content, setContent] = useState("");
  const [data, setData] = useState(null);
  const [editableKeywords, setEditableKeywords] = useState([]);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualDept, setManualDept] = useState("");
  
  // ★ LocalStorage 데이터 상태
  const [historyList, setHistoryList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]); 

  // 1. 초기 로딩 (LocalStorage에서 불러오기)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHistory = localStorage.getItem("army_history");
      const savedFeedback = localStorage.getItem("army_feedback");
      
      if (savedHistory) setHistoryList(JSON.parse(savedHistory));
      if (savedFeedback) setFeedbackList(JSON.parse(savedFeedback));
    }
  }, []);

  // 2. 데이터 저장 도우미 함수
  const saveToLocalStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // 3. 분석 요청 (API 호출)
  const handleAnalyze = async () => {
    if (!content) return alert("내용을 입력해주세요.");
    setLoading(true);
    setData(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content, 
          feedbackHistory: feedbackList 
        }),
      });
      
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);

      setData(result);
      setEditableKeywords(result.keywords);

      // ★ 이력 저장
      const newEntry = {
        id: uuidv4(),
        timestamp: new Date().toLocaleString(),
        input: content,
        summary: result.summary,
        keywords: result.keywords,
        final_department: result.predictions[0].department,
        predictions: result.predictions
      };
      
      const updatedHistory = [newEntry, ...historyList];
      setHistoryList(updatedHistory);
      saveToLocalStorage("army_history", updatedHistory);

    } catch (error) {
      alert("분석 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. 키워드 저장
  const handleSaveKeywords = () => {
    if (!data) return;
    const updatedHistory = [...historyList];
    if (updatedHistory.length > 0) {
        updatedHistory[0].keywords = editableKeywords;
        setHistoryList(updatedHistory);
        saveToLocalStorage("army_history", updatedHistory);
        alert("키워드가 저장되었습니다.");
    }
  };

  // 5. 학습(정답 가르치기)
  const handleTrain = (targetDept) => {
    if (!confirm(`'${targetDept}'(을)를 정답으로 확정하시겠습니까?`)) return;

    // A. 피드백 저장
    const newFeedback = { input: content, department: targetDept };
    const updatedFeedback = feedbackList.filter(f => f.input !== content);
    updatedFeedback.push(newFeedback);
    
    setFeedbackList(updatedFeedback);
    saveToLocalStorage("army_feedback", updatedFeedback);

    // B. 이력 수정
    const updatedHistory = [...historyList];
    if (updatedHistory.length > 0) {
        updatedHistory[0].final_department = targetDept;
        setHistoryList(updatedHistory);
        saveToLocalStorage("army_history", updatedHistory);
    }

    alert(`학습 완료! 다음부터 '${targetDept}'(으)로 분류합니다.`);
  };

  // 기타 UI 기능들
  const removeKeyword = (idx) => setEditableKeywords(editableKeywords.filter((_, i) => i !== idx));
  const addKeyword = () => {
    if (newKeywordInput.trim()) {
      setEditableKeywords([...editableKeywords, newKeywordInput.trim()]);
      setNewKeywordInput("");
    }
  };

  const handleDeleteItem = (targetId) => {
    if(!confirm("삭제하시겠습니까?")) return;
    const updated = historyList.filter(item => item.id !== targetId);
    setHistoryList(updated);
    saveToLocalStorage("army_history", updated);
  };

  const handleClearAllHistory = () => {
    if(!confirm("전체 삭제하시겠습니까?")) return;
    setHistoryList([]);
    localStorage.removeItem("army_history");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden min-h-[80vh]">
        
        {/* 헤더 */}
        <div className="bg-slate-800 p-6 text-white flex justify-between items-center sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold">국회요구자료 AI 분류기 (Demo)</h1>
            <p className="text-slate-300 text-sm mt-1">Gemini-2.5-flash / Local Storage</p>
          </div>
          
          {/* 버튼 그룹 */}
          <div className="flex gap-2">
            {/* 1. 사용법 버튼 (새로 추가됨) */}
            <button 
              onClick={() => setView(view === "GUIDE" ? "MAIN" : "GUIDE")}
              className={`px-4 py-2 rounded text-sm font-bold border transition ${
                view === "GUIDE" 
                  ? "bg-slate-600 border-slate-500 text-white" 
                  : "bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200"
              }`}
            >
              {view === "GUIDE" ? "✕ 닫기" : "📘 사용법"}
            </button>

            {/* 2. 이력 조회 버튼 */}
            <button 
              onClick={() => setView(view === "HISTORY" ? "MAIN" : "HISTORY")}
              className={`px-4 py-2 rounded text-sm font-bold border transition ${
                view === "HISTORY"
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-700 hover:bg-slate-600 border-slate-600"
              }`}
            >
              {view === "HISTORY" ? "← 메인 복귀" : "📜 이력 조회"}
            </button>
          </div>
        </div>

        {/* 1. 메인 화면 */}
        {view === "MAIN" && (
          <div className="p-6 animate-fade-in">
            <label className="block text-slate-700 font-bold mb-2">요구자료 원문 입력</label>
            <textarea
              className="w-full h-32 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-black bg-slate-50"
              placeholder="요구내용 입력하면 AI가 자동으로 1️⃣요약 2️⃣키워드 추출 3️⃣주무부서를 분류합니다. ⚠️반드시 '가상데이터'를 입력하세요. Demo버전으로 하루 20개로 제한됩니다."
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
              <div className="mt-8 space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                  <h2 className="text-blue-800 font-bold mb-3">📄 핵심 요약(by. gemini)</h2>
                  <div className="text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{data.summary}</div>
                  
                  <div className="mt-6 pt-4 border-t border-blue-200">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-slate-500 font-bold">키워드 편집</p>
                      <button onClick={handleSaveKeywords} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 font-bold">저장 💾</button>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      {editableKeywords.map((kw, idx) => (
                        <div key={idx} className="flex items-center bg-white border border-blue-200 rounded-full px-3 py-1 shadow-sm">
                          <span className="text-blue-600 text-sm font-bold mr-2">#{kw}</span>
                          <button onClick={() => removeKeyword(idx)} className="text-slate-400 hover:text-red-500 font-bold text-xs">✕</button>
                        </div>
                      ))}
                      <div className="flex items-center gap-1">
                        <input type="text" value={newKeywordInput} onChange={(e) => setNewKeywordInput(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && addKeyword()} placeholder="추가" className="w-16 px-2 py-1 text-sm border rounded-full text-black"/>
                        <button onClick={addKeyword} className="bg-slate-200 rounded-full w-6 h-6 text-sm font-bold">+</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-slate-800 font-bold mb-4">🏢 담당 주무 부서 추천</h2>
                  <div className="grid gap-4">
                    {data.predictions.map((item, index) => (
                      <div key={index} className={`p-4 rounded-lg border flex justify-between items-center ${index === 0 ? "bg-green-50 border-green-200 ring-1 ring-green-400" : "bg-white"}`}>
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
        )} 

        {/* 2. 사용법 화면 (NEW) */}
        {view === "GUIDE" && (
          <div className="p-8 animate-fade-in text-slate-800">
             <div className="mb-8 border-b pb-4">
               <h2 className="text-2xl font-bold text-slate-800 mb-2">📘 사용 설명서</h2>
               <p className="text-slate-500">AI를 활용하여 국회 요구자료를 자동으로 분류하고 관리하는 사이트입니다.</p>
             </div>

             <div className="space-y-8">
               <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl flex-shrink-0">1</div>
                 <div>
                   <h3 className="text-lg font-bold mb-2">자료 입력 및 분석</h3>
                   <p className="text-slate-600 leading-relaxed">
                     메인 화면의 입력창에 요구자료 원문을 붙여넣고 <span className="font-bold text-blue-600">'분석 시작'</span> 버튼을 누르세요.<br/>
                     AI가 내용을 요약하고 핵심 키워드를 추출하며, 담당 주무 부서를 1~3순위까지 추천합니다.
                     <span className="text-sm text-blue-500 mt-1 block">* 주무 부서는 사용자에 의해 미리 정해진 부서로만 추천합니다. AI가 아무렇게나 생성하지 않습니다.</span>
                   </p>
                 </div>
               </div>

               <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl flex-shrink-0">2</div>
                 <div>
                   <h3 className="text-lg font-bold mb-2">키워드 편집 및 저장</h3>
                   <p className="text-slate-600 leading-relaxed">
                     분석된 요약문 하단에 태그 형태의 키워드가 생성됩니다.<br/>
                     불필요한 키워드는 <span className="text-red-500 font-bold">✕</span>를 눌러 삭제하고, 
                     새로운 키워드를 입력해 추가할 수 있습니다.<br/>
                     수정이 끝나면 꼭 <span className="font-bold text-blue-600 bg-blue-50 px-1 rounded">'저장 💾'</span> 버튼을 눌러야 이력에 반영됩니다.
                   </p>
                 </div>
               </div>

               <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl flex-shrink-0">3</div>
                 <div>
                   <h3 className="text-lg font-bold mb-2">AI 학습 (정답 가르치기)</h3>
                   <p className="text-slate-600 leading-relaxed">
                     추천된 부서 옆의 <span className="font-bold text-slate-700 border px-1 rounded">'이게 정답 ✅'</span> 버튼을 누르면, 
                     해당 내용을 학습 데이터로 저장합니다.<br/>
                     만약 원하는 부서가 목록에 없다면 하단의 <b>'직접 부서 입력'</b>란에 부서명을 쓰고 학습 버튼을 누르세요.<br/>
                     <span className="text-sm text-blue-500 mt-1 block">* 학습된 데이터는 브라우저(Local storage)에 저장되어 다음 분석 시 반영됩니다.</span>
                   </p>
                 </div>
               </div>

               <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl flex-shrink-0">4</div>
                 <div>
                   <h3 className="text-lg font-bold mb-2">이력 관리</h3>
                   <p className="text-slate-600 leading-relaxed">
                     우측 상단의 <span className="font-bold text-slate-700 bg-slate-200 px-1 rounded">'📜 이력 조회'</span> 버튼을 눌러 과거 분석 기록을 확인할 수 있습니다.<br/>
                     개별 기록을 삭제하거나 전체 기록을 초기화할 수 있습니다.
                   </p>
                 </div>
               </div>

               <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl flex-shrink-0">5</div>
                 <div>
                   <h3 className="text-lg font-bold mb-2">⚠️주의사항⚠️</h3>
                   <p className="text-slate-600 leading-relaxed">
                    본 사이트는 <span className="font-bold text-blue-600">데모 페이지</span>로 실제 데이터가 아닌 <span className="font-bold text-slate-700 bg-slate-200 px-1 rounded">가상의 데이터</span>
                    를 만들어 사용했으며<br/>입력창에도 <span className="font-bold text-slate-700 bg-slate-200 px-1 rounded">가상의 데이터</span>를 입력하기 바랍니다.
                   </p>
                 </div>
               </div>               
             </div>
          </div>
        )}

        {/* 3. 이력 화면 */}
        {view === "HISTORY" && (
          <div className="p-6 bg-slate-50 min-h-[600px] animate-fade-in">
             <div className="flex justify-between items-center mb-4">
                <span className="text-slate-500 text-sm">총 {historyList.length}건</span>
                <button onClick={handleClearAllHistory} className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs font-bold">전체 삭제 🗑️</button>
             </div>
             
             <div className="space-y-4">
               {historyList.map((item) => (
                 <div key={item.id} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 relative group">
                   <button onClick={() => handleDeleteItem(item.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 font-bold">✕</button>
                   <div className="flex items-center mb-3 gap-2">
                     <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{item.timestamp}</span>
                     <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{item.final_department}</span>
                   </div>
                   <div className="mb-3"><p className="text-slate-800 text-sm font-medium line-clamp-1">{item.input}</p></div>
                   {item.keywords && <div className="mb-3 flex gap-1 flex-wrap">{item.keywords.map((kw, i)=><span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">#{kw}</span>)}</div>}
                   <div className="bg-slate-50 p-3 rounded text-xs text-slate-600 whitespace-pre-wrap">{item.summary}</div>
                 </div>
               ))}
               {historyList.length === 0 && <div className="text-center text-slate-500 py-10">기록이 없습니다.</div>}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}