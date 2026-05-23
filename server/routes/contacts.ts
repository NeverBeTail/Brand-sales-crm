import express from "express";
import { prisma, getSimulatedUser, db } from "../db";
import { pushNotification } from "../sse";

export const contactRouter = express.Router();

contactRouter.get("/", async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: "담당자 조회 실패" });
  }
});

contactRouter.post("/", async (req, res) => {
  const { brandId, name, role, position, phone, email } = req.body;
  const userRole = req.headers["x-user-role"] as string || "Admin";
  const user = getSimulatedUser(userRole);

  if (!brandId || !name) {
    return res.status(400).json({ error: "❌ 브랜드 ID와 이름은 반드시 입력해야 합니다." });
  }

  try {
    const newContact = await prisma.contact.create({
      data: {
        id: `contact-${Date.now()}`,
        brandId,
        name,
        role: role || "Decision Maker",
        position: position || "담당자",
        phone: phone || "010-0000-0000",
        email: email || `${name.replace(/\s+/g, "").toLowerCase()}@company.com`
      }
    });

    db.auditLogs.unshift({
      id: `log-addcontact-${Date.now()}`,
      userId: `user-${userRole.toLowerCase()}`,
      userName: user.name,
      userRole: userRole,
      action: "CREATE_CONTACT",
      targetType: "CONTACT",
      targetName: name,
      details: `브랜드 [${brandId}]에 담당 바이어 [${name}] (직책: ${position}, 권한: ${role})을 추가 등록하였습니다.`,
      createdAt: new Date().toISOString()
    });

    pushNotification(
      "system",
      `👤 [담당 바이어 추가] ${name}`,
      `CRM에 [${name}] 님이 해당 브랜드의 제휴 바이어망에 수동 등록되었습니다.`
    );

    res.status(201).json({ success: true, contact: newContact });
  } catch (err) {
    res.status(500).json({ error: "담당자 등록 실패" });
  }
});

contactRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, role, position, phone, email } = req.body;
  const userRole = req.headers["x-user-role"] as string || "Admin";
  const user = getSimulatedUser(userRole);

  try {
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        role: role !== undefined ? role : undefined,
        position: position !== undefined ? position : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined
      }
    });

    db.auditLogs.unshift({
      id: `log-updatecontact-${Date.now()}`,
      userId: `user-${userRole.toLowerCase()}`,
      userName: user.name,
      userRole: userRole,
      action: "UPDATE_CONTACT",
      targetType: "CONTACT",
      targetName: updatedContact.name,
      details: `담당 바이어 [${updatedContact.name}] (부서/직책: ${updatedContact.position || "미지정"})의 정보를 업데이트 하였습니다.`,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, contact: updatedContact });
  } catch (err) {
    res.status(500).json({ error: "담당자 수정 실패" });
  }
});
