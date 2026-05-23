import { PrismaClient, BrandCategory, PipelineStatus } from "@prisma/client";

export const prisma = new PrismaClient();

// B2B Sales CRM Mock Datastore (Used strictly for initial database seeding if remote PostgreSQL is empty)
export const db = {
  solutions: [
    { id: "sol-1", code: "DODO", name: "도도포인트 (Dodo Point)", category: "적립/마케팅", description: "적립 및 타겟 고객 마케팅 자동화 솔루션" },
    { id: "sol-2", code: "WAITING", name: "나우웨이팅 (Now Waiting)", category: "대기 관리", description: "웨이팅 및 현장 대기 인원 제어 관리 시스템" },
    { id: "sol-3", code: "NAVER_RES", name: "네이버예약 (Naver Booking)", category: "예약 관리", description: "실시간 대면 매장 예약 관리 연계 솔루션" },
    { id: "sol-4", code: "NAVER_CONN", name: "네이버커넥트 (Naver Connect)", category: "고객 관리/연동", description: "전 채널 마케팅 알림 및 고품격 고객 관리 서비스" }
  ],
  brandSolutions: [
    { brandId: "brand-1", solutionId: "sol-1", pipelineStatus: "Deal Completed", department: "마케팅사업부", updatedAt: "2026-05-10T12:00:00Z" },
    { brandId: "brand-1", solutionId: "sol-2", pipelineStatus: "Proposal & Negotiation", department: "대기전략파트", updatedAt: "2026-05-20T14:30:00Z" },
    { brandId: "brand-1", solutionId: "sol-3", pipelineStatus: "First Meeting", department: "예약플랫폼팀", updatedAt: "2026-05-18T09:00:00Z" },
    { brandId: "brand-1", solutionId: "sol-4", pipelineStatus: "Cold Call", department: "고객솔루션TF", updatedAt: "2026-05-12T11:00:00Z" },
    
    { brandId: "brand-2", solutionId: "sol-1", pipelineStatus: "First Meeting", department: "마케팅사업부", updatedAt: "2026-05-19T09:12:00Z" },
    { brandId: "brand-2", solutionId: "sol-2", pipelineStatus: "Deal Completed", department: "대기전략파트", updatedAt: "2026-05-15T15:00:00Z" },
    { brandId: "brand-2", solutionId: "sol-3", pipelineStatus: "Cold Call", department: "예약플랫폼팀", updatedAt: "2026-05-11T13:30:00Z" },
    { brandId: "brand-2", solutionId: "sol-4", pipelineStatus: "Cold Call", department: "고객솔루션TF", updatedAt: "2026-05-10T14:40:00Z" },

    { brandId: "brand-3", solutionId: "sol-1", pipelineStatus: "Cold Call", department: "마케팅사업부", updatedAt: "2026-05-09T10:00:00Z" },
    { brandId: "brand-3", solutionId: "sol-2", pipelineStatus: "First Meeting", department: "대기전략파트", updatedAt: "2026-05-20T10:00:00Z" },
    { brandId: "brand-3", solutionId: "sol-3", pipelineStatus: "Cold Call", department: "예약플랫폼팀", updatedAt: "2026-05-08T09:30:00Z" },
    { brandId: "brand-3", solutionId: "sol-4", pipelineStatus: "Cold Call", department: "고객솔루션TF", updatedAt: "2026-05-07T11:00:00Z" },

    { brandId: "brand-4", solutionId: "sol-1", pipelineStatus: "Deal Completed", department: "마케팅사업부", updatedAt: "2026-05-05T12:00:00Z" },
    { brandId: "brand-4", solutionId: "sol-2", pipelineStatus: "Deal Completed", department: "대기전략파트", updatedAt: "2026-05-06T14:00:00Z" },
    { brandId: "brand-4", solutionId: "sol-3", pipelineStatus: "Deal Completed", department: "예약플랫폼팀", updatedAt: "2026-05-08T15:00:00Z" },
    { brandId: "brand-4", solutionId: "sol-4", pipelineStatus: "Proposal & Negotiation", department: "고객솔루션TF", updatedAt: "2026-05-20T11:00:00Z" }
  ],
  brands: [
    {
      id: "brand-1",
      name: "블루보틀 커피 코리아 (Blue Bottle)",
      category: "F&B Brand",
      logo: "B",
      headquarters: "서울특별시 성동구 아차산로 7",
      lat: 37.5443,
      lng: 127.0441,
      description: "글로벌 스페셜티 커피 브랜드. 국내 전역 플래그십 매장 보유 및 솔루션 도입 협의 중.",
      targetStoresCount: 12,
      monthlyRevenueEst: "월 평균 1.8억원 예상",
      pipelineStatus: "Proposal & Negotiation"
    },
    {
      id: "brand-2",
      name: "샐러디 본사 (Salady HQ)",
      category: "F&B Brand",
      logo: "S",
      headquarters: "서울특별시 강남구 테헤란로 210",
      lat: 37.5006,
      lng: 127.0365,
      description: "국내 F&B 샐러드 분야 1위 직영 및 가맹 브랜드. 모바일 스마트 대시보드 솔루션 검토 예정.",
      targetStoresCount: 350,
      monthlyRevenueEst: "월 평균 25억원 규모",
      pipelineStatus: "First Meeting"
    },
    {
      id: "brand-3",
      name: "무인양품 코리아 (MUJI HQ)",
      category: "Non-food Brand",
      logo: "M",
      headquarters: "서울특별시 용산구 독서당로 122",
      lat: 37.5342,
      lng: 127.0118,
      description: "일본 라이프스타일 디자인 미니멀리즘 브랜드. 강남 플래그십 스토어 중심 디지털 사이니지 시범 운용 조율.",
      targetStoresCount: 40,
      monthlyRevenueEst: "월 평균 9억원 규모",
      pipelineStatus: "Cold Call"
    },
    {
      id: "brand-4",
      name: "폴바셋 코리아 (Paul Bassett)",
      category: "F&B Brand",
      logo: "P",
      headquarters: "서울특별시 강남구 테헤란로 124",
      lat: 37.4981,
      lng: 127.0276,
      description: "매일유업 계열 스페셜티 커피 프랜차이즈. 지능형 매장 상태 매핑 솔루션 도입 추진 중.",
      targetStoresCount: 110,
      monthlyRevenueEst: "월 평균 14억원 규모",
      pipelineStatus: "Deal Completed"
    }
  ],
  contacts: [
    {
      id: "contact-1",
      brandId: "brand-1",
      name: "이도윤 이사",
      role: "브랜드 본사 담당자",
      position: "CBO (최고 비즈니스 책임자)",
      phone: "010-4829-1928",
      email: "dy.lee@bluebottlecoffee.co.kr",
    },
    {
      id: "contact-2",
      brandId: "brand-1",
      name: "한채원 팀장",
      role: "브랜드 본사 담당자",
      position: "가맹 기획 총괄 매니저",
      phone: "010-8821-3942",
      email: "cw.han@bluebottlecoffee.co.kr",
    },
    {
      id: "contact-b1-van1",
      brandId: "brand-1",
      name: "김진우 소장",
      role: "VAN대리점",
      position: "수도권 솔루션 대리점장",
      phone: "010-3344-5566",
      email: "jw.kim@vanagent.co.kr",
    },
    {
      id: "contact-b1-van2",
      brandId: "brand-1",
      name: "박준형 대표",
      role: "VAN대리점",
      position: "성동 지역 VAN 대리인",
      phone: "010-7788-9900",
      email: "jh.park@vanagent.co.kr",
    },
    {
      id: "contact-b1-etc1",
      brandId: "brand-1",
      name: "최영희 주임",
      role: "그 외",
      position: "인테리어 협력사 차장",
      phone: "010-2233-4455",
      email: "yh.choi@etcpartner.co.kr",
    },
    {
      id: "contact-3",
      brandId: "brand-2",
      name: "김민재 과장",
      role: "브랜드 본사 담당자",
      position: "F&B 솔루션 검토 실무진",
      phone: "010-3392-1144",
      email: "mj.kim@salady.kr",
    },
    {
      id: "contact-b2-hq2",
      brandId: "brand-2",
      name: "이지훈 대리",
      role: "브랜드 본사 담당자",
      position: "가맹 기획 담당",
      phone: "010-1212-3434",
      email: "jh.lee@salady.kr",
    },
    {
      id: "contact-4",
      brandId: "brand-2",
      name: "박선주 대표주주",
      role: "VAN대리점",
      position: "학동역 가맹점주 협의회 주주",
      phone: "010-7211-5509",
      email: "sj.park@salady-franchise.net",
    },
    {
      id: "contact-b2-van2",
      brandId: "brand-2",
      name: "백영민 부장",
      role: "VAN대리점",
      position: "강남 리테일 VAN 센터장",
      phone: "010-9988-7766",
      email: "ym.baek@vancenter.co.kr",
    },
    {
      id: "contact-b2-etc1",
      brandId: "brand-2",
      name: "김가영 실장",
      role: "그 외",
      position: "법무 대리인",
      phone: "010-5566-7788",
      email: "gy.kim@lawpartners.co.kr",
    },
    {
      id: "contact-5",
      brandId: "brand-3",
      name: "최성우 본부장",
      role: "브랜드 본사 담당자",
      position: "브랜드 리테일 전략 사업부장",
      phone: "010-8812-7880",
      email: "sw.choi@muji.co.kr",
    },
    {
      id: "contact-b3-hq2",
      brandId: "brand-3",
      name: "정성호 과장",
      role: "브랜드 본사 담당자",
      position: "리테일 기획 파트원",
      phone: "010-4455-6677",
      email: "sh.jung@muji.co.kr",
    },
    {
      id: "contact-b3-van1",
      brandId: "brand-3",
      name: "정재훈 소장",
      role: "VAN대리점",
      position: "국내 리테일 기기 VAN 파트너",
      phone: "010-8877-6655",
      email: "jw.jung@vanretail.co.kr",
    },
    {
      id: "contact-b3-etc1",
      brandId: "brand-3",
      name: "민경오 대표",
      role: "그 외",
      position: "부동산 중개 협회장",
      phone: "010-1122-3344",
      email: "ko.min@realestate.org",
    }
  ],
  meetings: [
    {
      id: "meet-1",
      brandId: "brand-1",
      contactId: "contact-1",
      solutionId: "sol-2",
      department: "대기전략파트",
      title: "블루보틀 솔루션 론칭 세부 조건 제안 미팅",
      dateTime: "2026-05-20T14:30:00Z",
      type: "Offline",
      location: "서울특별시 성동구 아차산로 7 블루보틀 본사 5층 회의실",
      googleMeetLink: "",
      pipelineStatus: "Proposal & Negotiation",
      notes: "사전 음성 메모: 블루보틀의 전 점포 키오스크 연동 및 멤버십 제휴 솔루션에 대해 의사결정권자 대면 설득 전략 필요.",
      summary: "이도윤 이사와 본사 시범 매장 설치 비용 분담 및 6개월 파일럿 테스트 운용 조건에 부합하는 솔루션 제안서 합의 완료. 수수료 정산 주기 수정 요청 대응 예정.",
      actionItems: [
        "수수료 정산 주기를 기존 월초 5일에서 10일로 수정한 정정 파일럿 계약서 초안 작성",
        "차주 화요일 오전 10시 원격 연동 관련 IT 실무진 화상 세션 조율",
        "폴바셋 참고용 동일 커스텀 포맷 성공 레퍼런스 PDF 발송"
      ]
    },
    {
      id: "meet-2",
      brandId: "brand-2",
      contactId: "contact-3",
      solutionId: "sol-1",
      department: "마케팅사업부",
      title: "샐러디 가맹 정산 디지털화 비대면 첫 미팅",
      dateTime: "2026-05-20T17:00:00Z",
      type: "Online",
      location: "Google Meet 온라인 세션",
      googleMeetLink: "https://meet.google.com/qny-pujb-tzm",
      pipelineStatus: "First Meeting",
      notes: "가맹점 정산 수작업 고통 해결을 위한 자동 ERP 크롤러 모듈 소개 자료 준비.",
      summary: "실무진 비대면 회의 종료. 가맹점주 전수 조사 시 관리자 데이터 통합 필요성에 백번 동의함. 다만 점주들 고령화로 UI 모바일 최적화 및 간편 음성 입력 솔루션 필요성 지적.",
      actionItems: [
        "모바일 간편 점주용 음성 피드백 입력 시안 데모 전달",
        "직영점 5개 매장 한정 파일럿 테스트 예산 산출서 송부"
      ]
    }
  ],
  notifications: [
    {
      id: "notif-1",
      type: "pipeline",
      title: "파이프라인 업데이트",
      message: "블루보틀 커피 코리아 브랜드의 상태가 [Proposal & Negotiation] 단계로 정상 진입되었습니다.",
      isRead: false,
      createdAt: "2026-05-20T11:00:00Z"
    },
    {
      id: "notif-2",
      type: "action_item",
      title: "액션 아이템 할당",
      message: "샐러디 본사 가맹 솔루션 검토를 위한 '모바일 점주용 음성 피드백 데모' 작성 임무가 추가되었습니다.",
      isRead: false,
      createdAt: "2026-05-20T10:30:00Z"
    }
  ],
  auditLogs: [
    {
      id: "log-1",
      userId: "user-doyun",
      userName: "이도윤 이사",
      userRole: "Admin",
      action: "UPDATE_PIPELINE",
      targetType: "BRAND",
      targetName: "블루보틀 커피 코리아 (Blue Bottle)",
      details: "영업 세일즈 칸반 상태를 [First Meeting]에서 [Proposal & Negotiation] 단계로 정상 실시간 격상하였습니다.",
      createdAt: "2026-05-20T11:00:00Z"
    },
    {
      id: "log-2",
      userId: "user-sungwoo",
      userName: "최성우 본부장",
      userRole: "Manager",
      action: "CREATE_MEETING",
      targetType: "MEETING",
      targetName: "샐러디 가맹 정산 디지털화 비대면 첫 미팅",
      details: "구글 캘린더 연동 및 Google Meet 온라인 원격 미팅방 자동 개설(https://meet.google.com/qny-pujb-tzm)을 조율 완료하였습니다.",
      createdAt: "2026-05-20T10:45:00Z"
    }
  ],
  salesGoals: [
    {
      id: "goal-1",
      userName: "이도윤 이사",
      userRole: "Admin",
      targetType: "Revenue & Deals",
      metricName: "계약 성사 건수 (Deals Closed)",
      targetValue: 10,
      currentValue: 8,
      period: "2026년 5월 (월간)",
      color: "indigo"
    },
    {
      id: "goal-2",
      userName: "최성우 본부장",
      userRole: "Manager",
      targetType: "Meetings & Leads",
      metricName: "신규 도입 제안 미팅 (Meetings Hosted)",
      targetValue: 15,
      currentValue: 11,
      period: "2026년 5월 (월간)",
      color: "emerald"
    },
    {
      id: "goal-3",
      userName: "한채원 대리",
      userRole: "Sales_Rep",
      targetType: "Meetings & Leads",
      metricName: "영업 개척 및 발굴 미팅 (Prospecting)",
      targetValue: 8,
      currentValue: 6,
      period: "2026년 5월 (월간)",
      color: "rose"
    }
  ],
  backups: [
    {
      id: "backup-20260520-0300",
      fileName: "B2B_CRM_Postgres_Backup_20260520_0300.tar.gz",
      status: "COMPLETED",
      databaseSize: "24.8 MB",
      recordsCount: 4280,
      details: "PostgreSQL 덤프(pg_dump) 자동 완료 및 AWS S3 보안 아카이브 보존 무결성 체크 완료.",
      createdAt: "2026-05-20T03:00:00Z"
    }
  ],
  syncStatus: {
    lastSynced: "2026-05-20T12:00:00Z",
    syncedEventsCount: 14,
    isSyncing: false,
  }
};

export function mapCategory(cat: string): BrandCategory {
  switch (cat) {
    case "F&B Brand": return BrandCategory.FB_Brand;
    case "Non-food Brand": return BrandCategory.Non_food_Brand;
    case "Retail/Store": return BrandCategory.Retail_Store;
    case "Franchise Partner": return BrandCategory.Franchise_Partner;
    default: return BrandCategory.FB_Brand;
  }
}

export function mapStatus(status: string): PipelineStatus {
  switch (status) {
    case "Cold Call": return PipelineStatus.Cold_Call;
    case "First Meeting": return PipelineStatus.First_Meeting;
    case "Proposal & Negotiation": return PipelineStatus.Proposal_Negotiation;
    case "Deal Completed": return PipelineStatus.Deal_Completed;
    default: return PipelineStatus.Cold_Call;
  }
}

export async function seedDatabaseIfEmpty() {
  const brandCount = await prisma.brand.count();
  if (brandCount > 0) {
    console.log("🌱 [DATABASE SEED] Supabase PostgreSQL database already has records. Skipping initial seeding.");
    return;
  }

  console.log("🌱 [DATABASE SEED] Seeding Supabase PostgreSQL database with initial CRM mock data...");
  try {
    // 1. Seed Solutions
    for (const sol of db.solutions) {
      let actualCode = "DodoPoint";
      if (sol.code === "WAITING") actualCode = "NowWaiting";
      else if (sol.code === "NAVER_RES") actualCode = "NaverBooking";
      else if (sol.code === "NAVER_CONN") actualCode = "NaverConnect";

      await prisma.solution.upsert({
        where: { code: actualCode },
        update: {},
        create: {
          id: sol.id,
          name: sol.name,
          code: actualCode,
          category: sol.category,
          description: sol.description
        }
      });
    }

    // 2. Seed Brands
    for (const b of db.brands) {
      await prisma.brand.create({
        data: {
          id: b.id,
          name: b.name,
          category: mapCategory(b.category),
          logo: b.logo,
          headquarters: b.headquarters,
          lat: b.lat,
          lng: b.lng,
          description: b.description,
          targetStoresCount: b.targetStoresCount,
          monthlyRevenueEst: b.monthlyRevenueEst
        }
      });
    }

    // 3. Seed Brand Solutions
    for (const bs of db.brandSolutions) {
      await prisma.brandSolution.create({
        data: {
          brandId: bs.brandId,
          solutionId: bs.solutionId,
          pipelineStatus: mapStatus(bs.pipelineStatus),
          department: bs.department
        }
      });
    }

    // 4. Seed Contacts
    for (const c of db.contacts) {
      await prisma.contact.create({
        data: {
          id: c.id,
          brandId: c.brandId,
          name: c.name,
          role: c.role,
          position: c.position,
          phone: c.phone,
          email: c.email
        }
      });
    }

    // 5. Seed Meetings
    for (const m of db.meetings) {
      await prisma.meeting.create({
        data: {
          id: m.id,
          brandId: m.brandId,
          contactId: m.contactId || null,
          solutionId: m.solutionId || null,
          department: m.department,
          title: m.title,
          dateTime: new Date(m.dateTime),
          type: m.type,
          location: m.location,
          googleMeetLink: m.googleMeetLink,
          pipelineStatus: mapStatus(m.pipelineStatus),
          notes: m.notes,
          summary: m.summary,
          actionItems: m.actionItems
        }
      });
    }

    console.log("🌱 [DATABASE SEED] Seeding completed successfully! 🚀");
  } catch (error) {
    console.error("❌ [DATABASE SEED ERROR] Failed to seed Supabase database:", error);
  }
}

export function getSimulatedUser(role: string) {
  switch (role) {
    case "Manager":
      return { id: "user-sungwoo", name: "최성우 본부장", role: "Manager" };
    case "Sales_Rep":
      return { id: "user-chaewon", name: "한채원 대리", role: "Sales_Rep" };
    case "Admin":
    default:
      return { id: "user-doyun", name: "이도윤 이사", role: "Admin" };
  }
}
