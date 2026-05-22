# 🚀 B2B Sales CRM for F&B and Retail Brands

> 외부 현장 미팅이 잦은 B2B 영업팀을 위한 AI 기반 스마트 세일즈 CRM 및 일정 관리 솔루션입니다. 
> Google Calendar와의 양방향 동기화, 모바일 AI 음성 회의록 작성, 그리고 지도 기반 동선 최적화를 통해 영업팀의 생산성을 극대화합니다.

<br/>

## ✨ Key Features (핵심 기능)

- **🗓 Google Calendar 2-Way Sync:** 앱 내 일정 수정 시 구글 캘린더 실시간 반영 (화상회의 링크 자동 생성)
- **🤖 AI Sales Assistant & RAG Query:** 모바일에서 음성으로 미팅 결과 녹음 시 텍스트 변환(STT) 및 핵심 내용 3줄 요약/Action Item 자동 추출 (OpenAI Whisper & GPT-4o). PostgreSQL `pgvector` 기반의 RAG 사내 지식 검색 시스템 탑재.
- **🗺 Map-based Dashboard:** 오늘 방문할 F&B/논푸드 매장 및 본사 위치를 지도 위에 시각화하여 최적 이동 동선 파악.
- **📊 Sales Pipeline Kanban:** 드래그 앤 드롭 방식의 직관적인 영업 단계 관리 (Cold Call -> Meeting -> Proposal -> Closed) 및 웹훅 기반의 Typeform 인바운드 리드 실시간 격발 유입 수동 모의 유도.
- **🏢 Client Portal (파트너 포털):** 가맹 계약 조율을 위한 고객사 전용 매직링크 대시보드. 마일스톤, 파트너 협업 자료실 및 세일즈 위원 직통 의견 피드백 수납.
- **🔒 RBAC & Audit Log:** 관리자/팀원 간 권한 분리 및 데이터 수정 이력 추적(Soft Delete 적용).

<br/>

## 🛠 Tech Stack (기술 스택)

**Frontend**
- React 18
- Vite
- Tailwind CSS
- Lucide React

**Backend & Database**
- Node.js (Express)
- In-memory PostgreSQL / pgvector Simulated Mock DB Schema with rich vector mathematics
- SQLite / JSON Data File Persistence

**External APIs**
- Google Calendar API (OAuth 2.0)
- Google Maps API
- Gemini API (AI Synthesis, Audio Voice Summarization, Email Drafting, etc.)

<br/>

## ⚙️ Getting Started (시작하기)

### 1. Repository Clone
```bash
git clone https://github.com/YourUsername/b2b-sales-crm.git
cd b2b-sales-crm
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables (.env)
백엔드 및 프론트엔드 루트 디렉토리에 `.env` 파일을 생성하고 다음 변수를 설정합니다.

```env
PORT=3000
GEMINI_API_KEY="your_gemini_api_key"
```

### 4. Run the Application
```bash
# 개발 모드 실행
npm run dev
```

<br/>

## 📁 Project Structure (프로젝트 구조)
```plaintext
📦 b2b-sales-crm
 ┣ 📂 src                    # React 클라이언트 소스 코드
 ┃ ┣ 📂 components           # 공통 UI 컴포넌트 & Common Design System
 ┃ ┣ 📜 App.tsx              # 메인 라우팅 및 뷰 통합 엔트리
 ┃ ┗ 📜 types.ts             # 데이터 모델 및 권한 정의
 ┣ 📜 server.ts              # Express Backend & RAG API & Static Host 서비스
 ┗ 📜 README.md              # 프로젝트 리드미 가이드문서
```

---
🤝 **Contribution (기여 방법):**
1. `main` 브랜치에서 새로운 기능성 브랜치를 분기합니다 (`git checkout -b feature/cool-idea`).
2. 변경 사항을 우아하게 커밋합니다 (`git commit -m 'Add: 새로운 기능 추가'`).
3. 원격 브랜치에 푸시한 후 Pull Request를 오픈해 주세요.

_Designed and Developed for High-Performance B2B Sales Teams._
