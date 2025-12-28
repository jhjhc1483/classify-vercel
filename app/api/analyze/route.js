import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const PDFParser = require("pdf2json");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const parsePdfBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);
    
    pdfParser.on("pdfParser_dataError", (errData) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", () => {
      const text = pdfParser.getRawTextContent();
      resolve(text);
    });

    try {
      pdfParser.parseBuffer(buffer);
    } catch (e) {
      reject(e);
    }
  });
};

const loadFile = async (filename) => {
  try {
    const filePath = path.join(process.cwd(), "assets", filename);

    if (!fs.existsSync(filePath)) {
      console.error(`[Error] 파일이 존재하지 않음: ${filePath}`);
      return "";
    }

    if (filename.endsWith(".pdf")) {
      const dataBuffer = fs.readFileSync(filePath);
      const text = await parsePdfBuffer(dataBuffer);
      return text;
    } else {
      return fs.readFileSync(filePath, "utf-8");
    }
  } catch (error) {
    console.error(`[Error] 파일 읽기 실패 (${filename}):`, error);
    return "";
  }
};

export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Server API Key Config Error" }, { status: 500 });
    }

    const { content, feedbackHistory } = await req.json();

    const regulationText = await loadFile("regulation.pdf");
    const deptList = await loadFile("departments.txt");

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    let feedbackPrompt = "없음";
    if (feedbackHistory && feedbackHistory.length > 0) {
      feedbackPrompt = feedbackHistory.map(f => 
        `- 입력내용: '${f.input}' -> 정답부서: '${f.department}'`
      ).join("\n");
    }

    const prompt = `
    당신은 대한민국 국방 행정 전문가입니다. 
    [참고 자료]를 바탕으로 [국회요구자료]를 분석하여 JSON 형식으로 응답하세요.
    
    [참고 자료 - 부서 목록]
    ${deptList}

    [참고 자료 - 업무 규정 (일부 발췌)]
    ${regulationText.slice(0, 30000)}

    [참고 자료 - 과거 정정 사례]
    ${feedbackPrompt}

    [국회요구자료 원문]
    ${content}

    ### 출력 형식 (JSON):
    {
        "summary": "요약...",
        "keywords": ["k1", "k2", "k3"],
        "predictions": [
            {"rank": 1, "department": "부서", "reason": "이유"},
            {"rank": 2, "department": "부서", "reason": "이유"},
            {"rank": 3, "department": "부서", "reason": "이유"}
        ]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonResult = JSON.parse(text);
    return NextResponse.json(jsonResult);

  } catch (error) {
    console.error("Final Error Handler:", error);
    return NextResponse.json({ error: `서버 에러: ${error.message}` }, { status: 500 });
  }
}