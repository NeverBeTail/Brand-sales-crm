import express from "express";
import { prisma, mapCategory, mapStatus, getSimulatedUser, db } from "../db";
import { pushNotification } from "../sse";

// 1. Brands Router (/api/brands)
export const brandRouter = express.Router();

brandRouter.get("/", async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        solutions: {
          include: {
            solution: true
          }
        },
        contacts: true
      }
    });

    const mappedBrands = brands.map(brand => {
      let overallStatus = "Cold Call";
      const statuses = brand.solutions.map(s => s.pipelineStatus);
      if (statuses.includes("Deal_Completed")) {
        overallStatus = "Deal Completed";
      } else if (statuses.includes("Proposal_Negotiation")) {
        overallStatus = "Proposal & Negotiation";
      } else if (statuses.includes("First_Meeting")) {
        overallStatus = "First Meeting";
      }

      let categoryStr = "F&B Brand";
      if (brand.category === "Non_food_Brand") categoryStr = "Non-food Brand";
      else if (brand.category === "Retail_Store") categoryStr = "Retail/Store";
      else if (brand.category === "Franchise_Partner") categoryStr = "Franchise Partner";

      return {
        id: brand.id,
        name: brand.name,
        category: categoryStr,
        logo: brand.logo,
        headquarters: brand.headquarters,
        lat: brand.lat,
        lng: brand.lng,
        description: brand.description,
        targetStoresCount: brand.targetStoresCount,
        monthlyRevenueEst: brand.monthlyRevenueEst,
        pipelineStatus: overallStatus,
        createdAt: brand.createdAt.toISOString()
      };
    });

    res.json(mappedBrands);
  } catch (err: any) {
    console.error("GET /api/brands error:", err);
    res.status(500).json({ error: "브랜드 조회 실패" });
  }
});

brandRouter.post("/", async (req, res) => {
  const { 
    name, 
    category, 
    headquarters, 
    description, 
    targetStoresCount, 
    monthlyRevenueEst, 
    pipelineStatus,
    contactName,
    contactRole,
    contactPosition,
    contactPhone,
    contactEmail
  } = req.body;

  const userRole = req.headers["x-user-role"] as string || "Admin";
  const user = getSimulatedUser(userRole);

  if (!name) {
    return res.status(400).json({ error: "❌ 브랜드명(name)은 필수 필드입니다." });
  }

  const lat = 37.5665 + (Math.random() - 0.5) * 0.05;
  const lng = 126.9780 + (Math.random() - 0.5) * 0.05;

  try {
    const allSolutions = await prisma.solution.findMany();
    
    const createdBrand = await prisma.brand.create({
      data: {
        id: `brand-${Date.now()}`,
        name,
        category: mapCategory(category),
        logo: name.substring(0, 1).toUpperCase(),
        headquarters: headquarters || "서울특별시 마포구 월드컵북로",
        lat,
        lng,
        description: description || "아웃바운드 세일즈 발굴을 통해 개척한 가맹사 정보입니다.",
        targetStoresCount: Number(targetStoresCount) || 1,
        monthlyRevenueEst: monthlyRevenueEst || "월 평균 2,000만원 규모",
        contacts: contactName ? {
          create: {
            id: `contact-${Date.now()}`,
            name: contactName,
            role: contactRole || "Decision Maker",
            position: contactPosition || "담당자",
            phone: contactPhone || "010-0000-0000",
            email: contactEmail || "info@brand.com"
          }
        } : undefined,
        solutions: {
          create: allSolutions.map(sol => ({
            id: `brand-sol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            solutionId: sol.id,
            pipelineStatus: mapStatus(pipelineStatus),
            department: sol.code === "DodoPoint" ? "마케팅사업부" :
                        sol.code === "NowWaiting" ? "대기전략파트" :
                        sol.code === "NaverBooking" ? "예약플랫폼팀" : "고객솔루션TF"
          }))
        }
      },
      include: {
        contacts: true,
        solutions: true
      }
    });

    pushNotification(
      "system",
      `📥 [신규 아웃바운드 발굴] ${name}`,
      `${user.name}님이 신규 개척 브랜드 명단인 [${name}]을 등록했습니다. (목표 매장수: ${createdBrand.targetStoresCount}개)`
    );

    db.auditLogs.unshift({
      id: `log-addbrand-${Date.now()}`,
      userId: `user-${userRole.toLowerCase()}`,
      userName: user.name,
      userRole: userRole,
      action: "CREATE_BRAND",
      targetType: "BRAND",
      targetName: name,
      details: `아웃바운드 개척 등록: 브랜드 [${name}] 프로필 데이터 및 초동 연동 담당 바이어 [${contactName || "미확인"}] 정보를 일체 동시 수배 생성하였습니다.`,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: "📥 [아웃바운드 브랜드 수동 등록 완료] 브랜드 프로필 및 세일즈 파이프라인 초기 세팅이 적재되었습니다.",
      brand: {
        id: createdBrand.id,
        name: createdBrand.name,
        category: category || "F&B Brand",
        logo: createdBrand.logo,
        headquarters: createdBrand.headquarters,
        lat: createdBrand.lat,
        lng: createdBrand.lng,
        description: createdBrand.description,
        targetStoresCount: createdBrand.targetStoresCount,
        monthlyRevenueEst: createdBrand.monthlyRevenueEst,
        pipelineStatus: pipelineStatus || "Cold Call",
        createdAt: createdBrand.createdAt.toISOString()
      },
      contact: createdBrand.contacts[0] || null
    });
  } catch (err: any) {
    console.error("POST /api/brands error:", err);
    res.status(500).json({ error: "브랜드 등록 실패" });
  }
});

brandRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { pipelineStatus } = req.body;
  const userRole = req.headers["x-user-role"] as string || "Admin";
  const user = getSimulatedUser(userRole);

  if (userRole === "Sales_Rep" && id !== "brand-1" && id !== "brand-2") {
    return res.status(403).json({
      error: `🔒 [권한 통제 안내] 귀하는 일반 영업 대표(Sales_Rep) 권한 등급입니다. 본인 지정 담당 계정(블루보틀, 샐러디) 이외의 타 사업팀 거래처 정보는 무단 수정 또는 파이프라인 단계를 임의로 변경할 수 없습니다.`
    });
  }

  try {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { solutions: true }
    });

    if (!brand) {
      return res.status(404).json({ error: "브랜드를 찾을 수 없습니다." });
    }

    let oldStatus = "Cold Call";
    const statuses = brand.solutions.map(s => s.pipelineStatus);
    if (statuses.includes("Deal_Completed")) oldStatus = "Deal Completed";
    else if (statuses.includes("Proposal_Negotiation")) oldStatus = "Proposal & Negotiation";
    else if (statuses.includes("First_Meeting")) oldStatus = "First Meeting";

    await prisma.brandSolution.updateMany({
      where: { brandId: id },
      data: { pipelineStatus: mapStatus(pipelineStatus) }
    });

    const newAudit = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UPDATE_PIPELINE" as any,
      targetType: "BRAND",
      targetName: brand.name,
      details: `세일즈 칸반 영업 단계를 [${oldStatus}]에서 [${pipelineStatus}] 단계로 최신 갱신하였습니다.`,
      createdAt: new Date().toISOString()
    };
    db.auditLogs.unshift(newAudit);

    if (oldStatus !== pipelineStatus) {
      let slackMsg = `📢 *[CRM 영업 현황]* *${brand.name}* 고객사의 세일즈 단계가 *[${oldStatus}]*에서 *[${pipelineStatus}]* 단계로 업데이트되었습니다.`;
      let notifTitle = "파이프라인 단계 변경";
      let notifMsg = `[${brand.name}] 브랜드의 영업 단계가 [${oldStatus}]에서 [${pipelineStatus}](으)로 변경되었습니다.`;
      
      if (pipelineStatus === "Deal Completed") {
        slackMsg = `🏆 *[경축! 계약 체결 완료]* *${brand.name}* 고객사가 최종 계약 합의(Deal Completed)를 도출했습니다! 축하합니다! 🎉`;
        notifTitle = "🏆 계약체결 경축! (Deal Completed)";
        notifMsg = `[${brand.name}] 브랜드와의 최종 계약이 극적으로 합의되었습니다! 전방 솔루션 인도를 축원합니다. 🎉`;
      }
      
      console.log(`[LOCAL SLACK EMULATOR LOG] ${slackMsg}`);
      pushNotification("pipeline", notifTitle, notifMsg);
    }

    res.json({
      id: brand.id,
      name: brand.name,
      pipelineStatus
    });
  } catch (err: any) {
    console.error("PATCH /api/brands/:id error:", err);
    res.status(500).json({ error: "파이프라인 단계 수정 실패" });
  }
});


// 2. Solutions Router (/api/solutions)
export const solutionRouter = express.Router();

solutionRouter.get("/", async (req, res) => {
  try {
    const solutions = await prisma.solution.findMany();
    const mapped = solutions.map(s => {
      let frontCode = "DODO";
      if (s.code === "NowWaiting") frontCode = "WAITING";
      else if (s.code === "NaverBooking") frontCode = "NAVER_RES";
      else if (s.code === "NaverConnect") frontCode = "NAVER_CONN";

      return {
        id: s.id,
        code: frontCode,
        name: s.name,
        category: s.category,
        description: s.description
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: "솔루션 조회 실패" });
  }
});


// 3. Brand Solutions Router (/api/brand-solutions)
export const brandSolutionRouter = express.Router();

brandSolutionRouter.get("/", async (req, res) => {
  try {
    const brandSolutions = await prisma.brandSolution.findMany({
      include: { solution: true }
    });
    const mapped = brandSolutions.map(bs => {
      let statusStr = "Cold Call";
      if (bs.pipelineStatus === "Deal_Completed") statusStr = "Deal Completed";
      else if (bs.pipelineStatus === "Proposal_Negotiation") statusStr = "Proposal & Negotiation";
      else if (bs.pipelineStatus === "First_Meeting") statusStr = "First Meeting";

      return {
        brandId: bs.brandId,
        solutionId: bs.solutionId,
        pipelineStatus: statusStr,
        department: bs.department,
        updatedAt: bs.updatedAt.toISOString()
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: "브랜드 솔루션 조회 실패" });
  }
});

brandSolutionRouter.get("/:brandId", async (req, res) => {
  const { brandId } = req.params;
  try {
    const brandSolutions = await prisma.brandSolution.findMany({
      where: { brandId },
      include: { solution: true }
    });
    const mapped = brandSolutions.map(bs => {
      let statusStr = "Cold Call";
      if (bs.pipelineStatus === "Deal_Completed") statusStr = "Deal Completed";
      else if (bs.pipelineStatus === "Proposal_Negotiation") statusStr = "Proposal & Negotiation";
      else if (bs.pipelineStatus === "First_Meeting") statusStr = "First Meeting";

      return {
        brandId: bs.brandId,
        solutionId: bs.solutionId,
        pipelineStatus: statusStr,
        department: bs.department,
        updatedAt: bs.updatedAt.toISOString()
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: "브랜드 솔루션 조회 실패" });
  }
});

brandSolutionRouter.patch("/:brandId/:solutionId", async (req, res) => {
  const { brandId, solutionId } = req.params;
  const { pipelineStatus, department } = req.body;
  const userRole = req.headers["x-user-role"] as string || "Admin";
  const user = getSimulatedUser(userRole);

  try {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    const solution = await prisma.solution.findUnique({ where: { id: solutionId } });

    if (!brand || !solution) {
      return res.status(404).json({ error: "브랜드 혹은 솔공 모델을 찾을 수 없습니다." });
    }

    const existingBs = await prisma.brandSolution.findUnique({
      where: { brandId_solutionId: { brandId, solutionId } }
    });

    const oldStatus = existingBs ? existingBs.pipelineStatus : "Cold_Call";
    const mappedOldStatus = oldStatus === "Deal_Completed" ? "Deal Completed" :
                            oldStatus === "Proposal_Negotiation" ? "Proposal & Negotiation" :
                            oldStatus === "First_Meeting" ? "First Meeting" : "Cold Call";

    const updatedBs = await prisma.brandSolution.upsert({
      where: { brandId_solutionId: { brandId, solutionId } },
      update: {
        pipelineStatus: mapStatus(pipelineStatus),
        department: department || undefined
      },
      create: {
        id: `brand-sol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        brandId,
        solutionId,
        pipelineStatus: mapStatus(pipelineStatus),
        department: department || "영업소통팀"
      }
    });

    const newAudit = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UPDATE_PIPELINE" as any,
      targetType: "BRAND",
      targetName: `${brand.name} [${solution.name}]`,
      details: `솔루션별 칸반 업데이트: [${solution.name}] 단계가 [${mappedOldStatus}] -> [${pipelineStatus}] 단계로 수정 탑재되었습니다.`,
      createdAt: new Date().toISOString()
    };
    db.auditLogs.unshift(newAudit);

    pushNotification(
      "pipeline",
      `⚙️ [제품별 파이프라인] ${solution.name}`,
      `${brand.name}의 ${solution.name} 세일즈 단계가 [${pipelineStatus}](으)로 업데이트완료 되었습니다.`
    );

    res.json({
      success: true,
      brandSolution: {
        brandId: updatedBs.brandId,
        solutionId: updatedBs.solutionId,
        pipelineStatus: pipelineStatus,
        department: updatedBs.department,
        updatedAt: updatedBs.updatedAt.toISOString()
      }
    });
  } catch (err: any) {
    console.error("PATCH /api/brand-solutions error:", err);
    res.status(500).json({ error: "브랜드 솔루션 상태 변경 실패" });
  }
});
