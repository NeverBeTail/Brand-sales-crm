import express from "express";
import { prisma, mapStatus, getSimulatedUser, db } from "../db";
import { pushNotification } from "../sse";

// 1. Meetings Router (/api/meetings)
export const meetingRouter = express.Router();

meetingRouter.get("/", async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
      include: { brand: true, contact: true, solution: true }
    });
    
    const mapped = meetings.map(m => {
      let statusStr = "Cold Call";
      if (m.pipelineStatus === "Deal_Completed") statusStr = "Deal Completed";
      else if (m.pipelineStatus === "Proposal_Negotiation") statusStr = "Proposal & Negotiation";
      else if (m.pipelineStatus === "First_Meeting") statusStr = "First Meeting";

      return {
        id: m.id,
        brandId: m.brandId,
        contactId: m.contactId,
        solutionId: m.solutionId,
        department: m.department,
        title: m.title,
        dateTime: m.dateTime.toISOString(),
        type: m.type,
        location: m.location,
        googleMeetLink: m.googleMeetLink,
        pipelineStatus: statusStr,
        notes: m.notes,
        summary: m.summary,
        actionItems: m.actionItems
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: "미팅 조회 실패" });
  }
});

meetingRouter.post("/", async (req, res) => {
  const { title, dateTime, type, location, brandId, contactId, newContactName, pipelineStatus, notes, summary, actionItems, solutionId, department } = req.body;
  const userRole = req.headers["x-user-role"] as string || "Admin";
  const user = getSimulatedUser(userRole);

  if (userRole === "Sales_Rep" && brandId !== "brand-1" && brandId !== "brand-2") {
    return res.status(403).json({
      error: `🔒 [권한 통제 안내] 귀하는 일반 영업 대표(Sales_Rep) 권한 등급입니다. 타 부서 관리 영역의 신규 영업 미팅 수급 기입 및 배정이 제한되어 있습니다.`
    });
  }

  try {
    let finalContactId = contactId;
    if (!contactId && newContactName) {
      const createdContact = await prisma.contact.create({
        data: {
          id: `contact-${Date.now()}`,
          brandId,
          name: newContactName,
          role: "Decision Maker",
          position: "신규 발굴 담당자",
          phone: "010-0000-0000",
          email: ""
        }
      });
      finalContactId = createdContact.id;
    }

    let googleMeetLink = "";
    let finalLocation = location || "";

    if (type === "Online") {
      const id = Math.random().toString(36).substring(2, 5) + "-" + 
                 Math.random().toString(36).substring(2, 6) + "-" + 
                 Math.random().toString(36).substring(2, 5);
      googleMeetLink = `https://meet.google.com/${id}`;
      finalLocation = "Google Meet 온라인 화상방";
    }

    let warning = "";
    const targetTime = new Date(dateTime || new Date());
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

    const allMeetings = await prisma.meeting.findMany({
      where: { brandId },
      include: { solution: true }
    });

    const overlappingMeeting = allMeetings.find(m => {
      const meetingTime = m.dateTime.getTime();
      return Math.abs(targetTime.getTime() - meetingTime) <= SEVEN_DAYS_MS;
    });

    const relatedBrand = await prisma.brand.findUnique({ where: { id: brandId } });
    const brandName = relatedBrand ? relatedBrand.name : "미지정 브랜드";

    if (overlappingMeeting) {
      const conflictingSolName = overlappingMeeting.solution?.name || "기타 연계 솔루션";
      const conflictingDept = overlappingMeeting.department || "영업기획팀";
      const conflictDateStr = overlappingMeeting.dateTime.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit' });
      
      warning = `🚨 [중복 영업 주의] 최근 7일 내(${conflictDateStr})에 다른 파트(${conflictingDept})에서 동일 브랜드(${brandName})와 '${conflictingSolName}' 솔루션 미팅("${overlappingMeeting.title}")을 이미 진행했거나 예약하였습니다. 고객사 혼동 및 신뢰성 타격을 예방하기 위해 사전 내부 회의 후 일정을 결정해 주세요!`;
      
      pushNotification(
        "system",
        "⚠️ 교차 영업 중복 컨택 경보",
        `거래처 [${brandName}]에 최근 7일 이내 타 사업팀(${conflictingDept})의 세일즈 이력 중복 검출.`
      );
    }

    const createdMeeting = await prisma.meeting.create({
      data: {
        id: `meet-${Date.now()}`,
        brandId,
        contactId: finalContactId || null,
        solutionId: solutionId || null,
        department: department || "고객성공팀",
        title: title || "새로운 미팅 일정",
        dateTime: targetTime,
        type: type || "Offline",
        location: finalLocation,
        googleMeetLink,
        pipelineStatus: mapStatus(pipelineStatus),
        notes: notes || "",
        summary: summary || "",
        actionItems: actionItems || []
      }
    });

    if (solutionId) {
      await prisma.brandSolution.upsert({
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
          department: department || "마케팅사업부"
        }
      });
    }

    const newAudit = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "CREATE_MEETING" as any,
      targetType: "MEETING",
      targetName: createdMeeting.title,
      details: `거래처 [${brandName}]에 대한 ${solutionId ? "특정" : "일반"} 세일즈 일정을 예약 기입했습니다.${warning ? " (⚠️ 중복 주의 경보가 포함되었습니다)" : ""}`,
      createdAt: new Date().toISOString()
    };
    db.auditLogs.unshift(newAudit);

    pushNotification(
      "system",
      "📅 새 세일즈 미팅 동기화완료",
      `[${brandName}] "${createdMeeting.title}" 일지 및 대면 회록이 구글 캘린더와 성공 연동되었습니다.`
    );

    if (actionItems && actionItems.length > 0) {
      pushNotification(
        "action_item",
        "📋 새 후속 액션 아이템 배정",
        `[${brandName}] 미팅 결과에 의거한 ${actionItems.length}가지 핵심 영업 Action Items가 수급 배정되었습니다.`
      );
    }

    res.status(201).json({
      id: createdMeeting.id,
      brandId: createdMeeting.brandId,
      contactId: createdMeeting.contactId,
      solutionId: createdMeeting.solutionId,
      department: createdMeeting.department,
      title: createdMeeting.title,
      dateTime: createdMeeting.dateTime.toISOString(),
      type: createdMeeting.type,
      location: createdMeeting.location,
      googleMeetLink: createdMeeting.googleMeetLink,
      pipelineStatus: pipelineStatus || "First Meeting",
      notes: createdMeeting.notes,
      summary: createdMeeting.summary,
      actionItems: createdMeeting.actionItems,
      warning: warning || undefined
    });
  } catch (err: any) {
    console.error("POST /api/meetings error:", err);
    res.status(500).json({ error: "미팅 생성 실패" });
  }
});

meetingRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers["x-user-role"] as string || "Admin";
  const user = getSimulatedUser(userRole);

  try {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      return res.status(404).json({ error: "찾을 수 없거나 이미 삭제된 미팅입니다." });
    }

    if (userRole === "Sales_Rep" && meeting.brandId !== "brand-1" && meeting.brandId !== "brand-2") {
      return res.status(403).json({
        error: `🔒 [권한 통제 안내] 귀하는 일반 영업 대표(Sales_Rep) 권한 등급입니다. 담당 외 영역 거래처의 회의 요약 정보나 액션 아이템 기재를 수정할 권한이 없습니다.`
      });
    }

    const { dateTime, pipelineStatus, ...restBody } = req.body;

    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        ...restBody,
        dateTime: dateTime ? new Date(dateTime) : undefined,
        pipelineStatus: pipelineStatus ? mapStatus(pipelineStatus) : undefined
      }
    });

    const brand = await prisma.brand.findUnique({ where: { id: meeting.brandId } });
    const brandName = brand ? brand.name : "미지정 브랜드";
    
    db.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "UPDATE_MEETING",
      targetType: "MEETING",
      targetName: updated.title,
      details: `[${brandName}] 미팅의 회의록 정리본, 3줄 요약 문안 및 후속 액션 아이템 자료를 최신 정보로 수정 탑재하였습니다.`,
      createdAt: new Date().toISOString()
    });

    res.json({
      id: updated.id,
      brandId: updated.brandId,
      contactId: updated.contactId,
      solutionId: updated.solutionId,
      department: updated.department,
      title: updated.title,
      dateTime: updated.dateTime.toISOString(),
      type: updated.type,
      location: updated.location,
      googleMeetLink: updated.googleMeetLink,
      pipelineStatus: pipelineStatus || "First Meeting",
      notes: updated.notes,
      summary: updated.summary,
      actionItems: updated.actionItems
    });
  } catch (err: any) {
    console.error("PATCH /api/meetings error:", err);
    res.status(500).json({ error: "미팅 수정 실패" });
  }
});

meetingRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers["x-user-role"] as string || "Admin";
  const user = getSimulatedUser(userRole);

  try {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      return res.status(404).json({ error: "삭제하려는 미팅을 찾을 수 없거나 이미 삭제되었습니다." });
    }

    if (userRole === "Sales_Rep" && meeting.brandId !== "brand-1" && meeting.brandId !== "brand-2") {
      return res.status(403).json({
        error: `🔒 [권한 통제 안내] 귀하는 일반 영업 대표(Sales_Rep) 권한 등급입니다. 담당 외 영역 거래처의 미팅 회의록 정보를 임의 논리 삭제(Soft Delete) 처리할 수 없습니다.`
      });
    }

    await prisma.meeting.delete({ where: { id } });

    const brand = await prisma.brand.findUnique({ where: { id: meeting.brandId } });
    const brandName = brand ? brand.name : "미지정 브랜드";

    db.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "SOFT_DELETE",
      targetType: "MEETING",
      targetName: meeting.title,
      details: `[${brandName}] 가맹 미팅 일지를 데이터베이스에서 완전히 삭제하였습니다.`,
      createdAt: new Date().toISOString()
    });

    res.json({ id, success: true });
  } catch (err: any) {
    console.error("DELETE /api/meetings error:", err);
    res.status(500).json({ error: "미팅 삭제 실패" });
  }
});


// 2. Calendar Sync Router (/api/calendar)
export const calendarRouter = express.Router();

calendarRouter.post("/sync", async (req, res) => {
  (db as any).syncStatus = (db as any).syncStatus || { lastSynced: "", syncedEventsCount: 0, isSyncing: false };
  db.syncStatus.isSyncing = true;
  await new Promise((resolve) => setTimeout(resolve, 1200));
  
  db.syncStatus.lastSynced = new Date().toISOString();
  db.syncStatus.syncedEventsCount += Math.floor(Math.random() * 4) + 1;
  db.syncStatus.isSyncing = false;
  
  res.json(db.syncStatus);
});

calendarRouter.get("/sync-status", (req, res) => {
  (db as any).syncStatus = (db as any).syncStatus || { lastSynced: "", syncedEventsCount: 0, isSyncing: false };
  res.json(db.syncStatus);
});
