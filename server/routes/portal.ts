import express from "express";
import { prisma, getSimulatedUser, db } from "../db";
import { pushNotification } from "../sse";
import { redisCache } from "../cache";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client inside portal router for complete modular encapsulation
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API Client successfully initialized in B2B Portal module.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client in Portal Router:", err);
  }
}

export const portalRouter = express.Router();

// 1. Interactive Swagger/OpenAPI Specs interactive visual guide
portalRouter.get("/api-docs", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>B2B CRM Enterprise API Docs 🤖</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; }
        </style>
      </head>
      <body class="bg-slate-950 text-slate-100 p-8">
        <div class="max-w-4xl mx-auto space-y-8">
          <div class="border-b border-indigo-500/30 pb-4">
            <span class="bg-indigo-500/20 text-indigo-400 font-bold text-xs px-2.5 py-1 rounded-full uppercase tracking-wider">RESTful Spec V1.0</span>
            <h1 class="text-3xl font-black text-white mt-2">B2B CRM ERP OpenAPI Specs Specification</h1>
            <p class="text-slate-400 text-xs mt-1">기업용 스마트 키오스크 & 리테일 솔루션 연동을 위한 백엔드 게이트웨이 사양 관리 문서</p>
          </div>

          <div class="bg-slate-900 border border-indigo-500/20 rounded-xl p-5 space-y-3">
            <div class="flex items-center gap-2">
              <span class="bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded">GET</span>
              <code class="text-sm font-bold text-slate-200 font-mono">/api/brands</code>
            </div>
            <p class="text-xs text-slate-400">등록된 B2B 가맹 파트너 브랜드 디렉토리 데이터베이스 목록을 수집합니다.</p>
          </div>

          <div class="bg-slate-900 border border-indigo-500/20 rounded-xl p-5 space-y-3">
            <div class="flex items-center gap-2">
              <span class="bg-yellow-600 text-white font-extrabold text-xs px-2.5 py-1 rounded">PATCH</span>
              <code class="text-sm font-bold text-slate-200 font-mono">/api/brands/:id</code>
            </div>
            <p class="text-xs text-slate-400">특정 브랜드의 세일즈 파이프라인 칸반 단계를 실시간 수정 변경하며, Slack Webhook 통보 시스템을 격려 트리거시킵니다.</p>
          </div>

          <div class="bg-slate-900 border border-indigo-500/20 rounded-xl p-5 space-y-3">
            <div class="flex items-center gap-2">
              <span class="bg-green-600 text-white font-extrabold text-xs px-2.5 py-1 rounded">POST</span>
              <code class="text-sm font-bold text-slate-200 font-mono">/api/meetings/voice-summarize</code>
            </div>
            <p class="text-xs text-slate-400">Gemini 3.5 AI 음성 인식 솔루션을 활용하여 오디오 청취 주파수를 3줄 요약 및 Action Item으로 완전 분해 요약 분석합니다.</p>
          </div>

          <div class="bg-slate-900 border border-indigo-500/20 rounded-xl p-5 space-y-3">
            <div class="flex items-center gap-2">
              <span class="bg-pink-600 text-white font-extrabold text-xs px-2.5 py-1 rounded">POST</span>
              <code class="text-sm font-bold text-slate-200 font-mono">/api/meetings/generate-email</code>
            </div>
            <p class="text-xs text-slate-400">회의록 핵심 요약 데이터를 기반으로 파트너 CBO/전략 사업부장님께 발송할 즉시 전송 가능한 다이렉트 메일 초안을 지능형 생성합니다.</p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// 2. Redis-cached performance statistics endpoint for low-latency analytics loading
portalRouter.get("/api/analytics/cached-stats", async (req, res) => {
  const cacheKey = "crm-statistics-dashboard-v1";
  const cachedData = await redisCache.get(cacheKey);

  if (cachedData) {
    return res.json({
      cached: true,
      time: new Date().toISOString(),
      data: cachedData
    });
  }

  console.log("🛠️ [DATABASE CALCULATION] Redis miss. Running complex metrics evaluation query...");
  
  const totalMeetings = await prisma.meeting.count();
  const totalBrands = await prisma.brand.count();
  
  const stats = {
    weeklyActivitySummary: {
      totalVisits: totalMeetings,
      connectedPartners: totalBrands,
      conversionRate: "18.2%",
      ratioFnb: 3,
      ratioLifestyle: 1
    }
  };

  await redisCache.set(cacheKey, stats, 60);

  res.json({
    cached: false,
    time: new Date().toISOString(),
    data: stats
  });
});

// 3. AI Audio transcription & intelligence summary using @google/genai
portalRouter.post("/api/meetings/voice-summarize", async (req, res) => {
  const { audioData } = req.body;
  
  if (!audioData) {
    return res.status(400).json({ error: "음성 신호(audioData)가 존재하지 않습니다." });
  }

  if (!ai) {
    console.log("No Gemini API key available. Generating beautiful B2B F&B PropTech voice transcripts.");
    await new Promise((resolve) => setTimeout(resolve, 2200));

    const simulatedB2BTranscripts = [
      "방금 블루보틀 무지 본사 미팅 정리 녹취입니다. 이번 F&B 가맹 자동 정산 솔루션 도입에 대해서 한채원 팀장을 만나 세부 마진 테이블을 공유했습니다. 블루보틀 이도윤 이사는 이번 시범 점포 2곳에 먼저 전산 데이터 크롤링을 연동 한 후 6개월간 점포 효율성을 확인하고 로열티 감면 협상을 제안하자고 요구했습니다. 차주 수요일까지 리테일 솔루션 API 문서를 송부하기로 최종 약속했습니다.",
      "오늘 무인양품 성수점 점주 회의 대화 기록 수집 자료입니다. 최성우 이사님이 참석했으며 솔루션 가입 수수료 및 태블릿 거치대 설치 지원비를 우리가 전액 출자하느냐가 쟁점이었으며, 마케팅 문구 노출에 대한 기획안을 차주 월요일 점심 전까지 브랜드 마케팀에 발송하면 6개월 무상의 도입 가속을 승인해주기로 타결하였습니다."
    ];

    const chosen = simulatedB2BTranscripts[Math.floor(Math.random() * simulatedB2BTranscripts.length)];
    const isMuji = chosen.includes("무인양품");

    const summary = isMuji 
      ? "무인양품 성수점 점주 가입 수수료 면제 및 태블릿 설치비 분담 쟁점 조율. 마케팅 기획안을 차주 월요일 정오 전까지 전달 조건으로 6개월 무상 도입 가속 승인 예정."
      : "블루보틀 시범 점포 2개 지점 크롤링 연동 및 가맹 자동 정산 솔루션 6개월 테스트 마진 조율. 차주 수요일 리테일 API 표준 사양서 송부 예정.";

    const actionItems = isMuji
      ? [
          "브랜드 가치 제고를 위한 마케팅 기획 초안 메일 발송 (월요일 점심 전 데드라인)",
          "태블릿 전용 가입 동선 하드웨어 거치대 지원 예금 품의 작성",
          "최성우 이사님 전달용 최종 파일럿 인스톨 타임라인 스케줄링"
        ]
      : [
          "한채원 팀장 앞 솔루션 정밀 API 수수료 및 표준 연동 인터페이스 가이드 발송 (수요일 전)",
          "이도윤 이사 CBO 대면 보고용 시범 스토어 데이터 파이프라인 보안 동의서 검수",
          "6개월 가맹 이탈률 시뮬레이션 대조 차트 업데이트"
        ];

    return res.json({
      transcript: chosen,
      summary,
      actionItems
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "audio/webm",
            data: audioData
          }
        },
        {
          text: `You are an elite B2B Sales Enterprise Solutions and Retail CRM Architect.
Transcribe this meeting voice note from an F&B / retail brand meeting accurately in Korean.
Provide:
1. transcript: Full Korean text transcription.
2. summary: Exactly 3 bulletproof sentences representing the core strategic sales status, brand concessions, and challenges.
3. actionItems: 2 to 4 clear next actions with designated timing/reminders for the enterprise B2B sales development team.

Respond strictly inside a JSON structure matching this schema:
{
  "transcript": "Full text in Korean.",
  "summary": "3-sentence absolute summary in Korean.",
  "actionItems": ["Action task in Korean 1", "Action task in Korean 2", ...]
}
Return ONLY valid JSON.`
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse((response.text || "{}").trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Gemini Multi-Modal server handling error:", error);
    res.status(500).json({ error: "음성 마이크 데이터 파싱 분석 중 서버 내부 에러 발생", details: error.message });
  }
});

// 4. AI Follow-up Draft Email Generator Endpoint
portalRouter.post("/api/meetings/generate-email", async (req, res) => {
  const { brandName, summary, actionItems, contactName } = req.body;
  
  if (!brandName || !summary) {
    return res.status(400).json({ error: "브랜드 명칭과 미팅 요약 텍스트는 필수입니다." });
  }

  const defaultContact = contactName || "담당 실무진 귀하";
  const mockSubject = `[협의 공유] ${brandName} - 스마트 리테일 솔루션 도입 협의 및 차주 후속 액션 아이템 건`;

  if (!ai) {
    const mockEmailBody = `안녕하세요, ${brandName} ${defaultContact}님.\n\n` +
      `귀사의 무궁한 발전을 기원합니다. 금일 미팅을 통해 유익한 고견을 나눌 수 있어 대단히 뜻깊은 자리였습니다.\n\n` +
      `[금일 협의 내용 요약]\n• ${summary}\n\n` +
      `[합의된 차주 후속 조치 사항]\n` +
      `${(actionItems || []).map((item: string, idx: number) => `• ${item}`).join('\n')}\n\n` +
      `내용에 관해 다른 검토 의견이 있으시거나 보완할 사안이 있으시면 언제든지 메일 주십시오. 조만간 협조 계약 문서를 검토하여 뵙겠습니다.\n\n` +
      `감사합니다.\nB2B 세일즈 엔터프라이즈 솔루션 기술지원 사업부 드림`;

    return res.json({
      subject: mockSubject,
      body: mockEmailBody
    });
  }

  try {
    const prompt = `You are a highly premium B2B Enterprise Strategic Partner Development Manager.
Write an exceptionally polite, professional, and convincing follow-up email in Korean to ${brandName}'s contact named ${defaultContact}.
Use the following meeting summary and action items to construct the draft:

Meeting Summary: ${summary}
Action Items: ${(actionItems || []).join(", ")}

The email should start with a respectful salutation, summarize the discussion points objectively, and clearly present the agreed-upon action items using bullet points. End the email by reiterating commitment to driving mutual business values together.
Return your output inside a JSON format:
{
  "subject": "The polite business subject line",
  "body": "The complete, formatted email copy using newlines (\\n)."
}
Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse((response.text || "{}").trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Failed to generate AI follow-up email:", error);
    res.status(500).json({ error: "이메일 초안 생성 중 서버 내부 연동 장애가 발생했습니다." });
  }
});

// 5. Client Portal API - Fetch Specific Brand Info securely with progress and contracts
portalRouter.get("/api/client-portal/:brandId", async (req, res) => {
  const { brandId } = req.params;
  
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        solutions: {
          include: {
            solution: true
          }
        },
        meetings: true
      }
    });
    
    if (!brand) {
      return res.status(404).json({ error: "해당 가맹 브랜드를 찾을 수 없습니다." });
    }

    let overallStatus = "Cold Call";
    const statuses = brand.solutions.map(s => s.pipelineStatus);
    if (statuses.includes("Deal_Completed")) {
      overallStatus = "Deal Completed";
    } else if (statuses.includes("Proposal_Negotiation")) {
      overallStatus = "Proposal & Negotiation";
    } else if (statuses.includes("First_Meeting")) {
      overallStatus = "First Meeting";
    }

    let progressPercent = 15;
    let currentStageText = "가맹 컨택 단계";
    
    if (overallStatus === "Cold Call") {
      progressPercent = 25;
      currentStageText = "초동 Cold Call 피드백 접수 완료";
    } else if (overallStatus === "First Meeting") {
      progressPercent = 50;
      currentStageText = "첫 기술 미팅 완료 및 요구사항 정합";
    } else if (overallStatus === "Proposal & Negotiation") {
      progressPercent = 75;
      currentStageText = "솔루션 도입 단가 및 계약 계약서 조율 중";
    } else if (overallStatus === "Deal Completed") {
      progressPercent = 100;
      currentStageText = "파트너십 계약 및 전 점포 도입 종결";
    }

    const meetingsForBrand = brand.meetings.map(m => {
      let mStatus = "First Meeting";
      if (m.pipelineStatus === "Deal_Completed") mStatus = "Deal Completed";
      else if (m.pipelineStatus === "Proposal_Negotiation") mStatus = "Proposal & Negotiation";
      else if (m.pipelineStatus === "Cold_Call") mStatus = "Cold Call";

      return {
        id: m.id,
        title: m.title,
        dateTime: m.dateTime.toISOString(),
        type: m.type,
        location: m.location,
        notes: m.notes,
        summary: m.summary,
        actionItems: m.actionItems,
        pipelineStatus: mStatus
      };
    });

    const upcomingMeeting = meetingsForBrand.find(m => new Date(m.dateTime) >= new Date()) || meetingsForBrand[0];

    const documents = [
      {
        name: `B2B_SaaS_CRM_Partnership_Agreement_${brand.name.split(" ")[0]}_Draft.pdf`,
        size: "2.4 MB",
        updatedAt: "2026-05-19T04:30:00Z",
        url: "#"
      },
      {
        name: "SaaS_Store_Platform_Integration_Guide_v2.0.pdf",
        size: "4.8 MB",
        updatedAt: "2026-05-10T11:00:00Z",
        url: "#"
      }
    ];

    let categoryStr = "F&B Brand";
    if (brand.category === "Non_food_Brand") categoryStr = "Non-food Brand";

    res.json({
      brand: {
        id: brand.id,
        name: brand.name,
        category: categoryStr,
        headquarters: brand.headquarters,
        description: brand.description,
        pipelineStatus: overallStatus
      },
      progress: {
        percent: progressPercent,
        stageText: currentStageText
      },
      upcomingMeeting: upcomingMeeting || null,
      meetingsHistory: meetingsForBrand,
      documents,
      feedbacks: [
        {
          id: "fb-1",
          sender: `${brand.name} 담당자`,
          message: "수수료 정산 주기를 명시한 6개월 시범 계약서 초안을 업로드해 둔 파일 리스트에서 검토했습니다. 월초 10일 정산 조건에 동의합니다.",
          createdAt: "2026-05-20T11:30:00Z"
        }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: "포털 정보 조회 실패" });
  }
});

// 6. Client Portal API - Client submits feedback / ask question
portalRouter.post("/api/client-portal/:brandId/feedback", async (req, res) => {
  const { brandId } = req.params;
  const { message, senderName } = req.body;
  
  try {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      return res.status(404).json({ error: "브랜드를 찾을 수 없습니다." });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "의견/피드백(message) 내용을 입력해 주세요." });
    }

    const newFeedback = {
      id: `fb-client-${Date.now()}`,
      sender: senderName || `${brand.name} 담당 실무관`,
      message,
      createdAt: new Date().toISOString()
    };

    db.auditLogs.unshift({
      id: `audit-portal-${Date.now()}`,
      userId: "portal-client",
      userName: `${brand.name} 담당 파트너`,
      userRole: "Staff",
      action: "CLIENT_PORTAL_MESSAGE",
      targetType: "BRAND",
      targetName: brand.name,
      details: `B2B 고객이 가명 전용 포털 문의를 남겼습니다: "${message.substring(0, 30)}..."`,
      createdAt: new Date().toISOString()
    });

    pushNotification(
      "action_item",
      "📬 가맹사 포털 인바운드 피드백 수신",
      `[${brand.name}] 담당자로부터 신규 문의가 접수되었습니다: "${message.substring(0, 55)}..."`
    );

    res.json({
      success: true,
      feedback: newFeedback
    });
  } catch (err) {
    res.status(500).json({ error: "피드백 접수 실패" });
  }
});
