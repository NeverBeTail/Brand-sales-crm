# Brand Sales CRM
> 브랜드별 거래처·담당자·미팅·솔루션 영업 단계를 연결하는 B2B 영업 관리 웹 애플리케이션.

React와 Express로 구성한 CRM 프로젝트입니다. 하나의 브랜드에 여러 솔루션을 제안하는 업무를 모델링하고, 미팅 기록과 후속 작업을 같은 흐름에서 관리합니다.

## 해결하려는 문제
- 브랜드별 담당자와 미팅 기록이 흩어지면 이전 협의 내용을 찾기 어렵습니다.
- 같은 브랜드라도 제안하는 솔루션마다 영업 단계가 다릅니다.
- 현장 미팅 이후 기록 정리와 일정 등록을 반복해야 합니다.

## 핵심 기능과 구현 범위
| 영역 | 저장소에서 확인할 수 있는 구현 |
| --- | --- |
| 거래처 관리 | 브랜드·담당자·미팅 조회 및 관리 API, 브랜드 상세 화면 |
| 영업 파이프라인 | 브랜드와 솔루션의 조합별 영업 단계 관리 |
| 일정 연동 | Google Calendar 이벤트 조회·생성·삭제 함수, CRM과 캘린더 간 가져오기·내보내기 흐름 |
| 회의 기록 보조 | Gemini를 호출하는 음성 요약·후속 이메일 초안 API. 키가 없을 때는 샘플 응답 사용 |
| 현황 파악 | 지도, 파이프라인 보드, 분석 대시보드, SSE 알림 |
| 사용자 관리 | Firebase Google 로그인, Firestore 사용자 프로필 및 권한 관련 UI |

### 구현 상태를 읽는 기준
- **RAG 검색:** 채팅 UI가 요청하는 `/api/rag-chat`의 서버 구현은 현재 확인되지 않습니다. pgvector 기반 검색이 완성된 프로젝트로 설명하지 않습니다.
- **캐시·백업·모니터링:** 캐시는 메모리 기반 시뮬레이터입니다. 백업 및 오류 알림 일부 API는 시연용 결과를 반환하며 실제 외부 백업·모니터링 연동을 보장하지 않습니다.
- **권한:** 일부 서버 API가 요청의 역할 값과 모의 사용자 정보를 사용합니다. 운영용 인증·인가가 완성된 상태로 간주하지 않습니다.
- **캘린더:** 연동 코드가 존재하지만 모든 수정·삭제의 지속적인 양방향 동기화를 보장하는 것은 아닙니다.

## 설계에서 볼 부분
### 브랜드와 솔루션 사이에 영업 단계를 둔 데이터 모델
`BrandSolution`은 `Brand`와 `Solution`을 연결하며, 조합마다 `pipelineStatus`를 보관합니다. 같은 브랜드에 대한 여러 제안을 독립적으로 추적하는 구조입니다. `brandId + solutionId` 조합에는 유일성 제약을 둡니다.

### 화면·API·데이터 저장소 분리
`server/routes/`에서 브랜드, 미팅, 담당자, 포털 API를 나눕니다. 주요 업무 데이터는 Prisma/PostgreSQL을 사용하고, 로그인 및 일부 사용자·연동 정보에는 Firebase를 사용합니다. 감사 로그·알림 등 일부 데이터는 메모리 상태로 관리되므로 데이터별 저장 위치를 구분해서 읽어야 합니다.

```mermaid
flowchart LR
  UI["React · TypeScript"] --> API["Express API"]
  API --> DB["Prisma · PostgreSQL"]
  UI --> FB["Firebase Auth · Firestore"]
  UI --> CAL["Google Calendar"]
  API --> AI["Gemini / 샘플 응답"]
  API --> SSE["SSE 알림"]
  SSE --> UI
```

## 기술 스택
- **화면:** React 19, TypeScript, Vite 6, Tailwind CSS 4, Recharts
- **서버·데이터:** Node.js, Express 4, Prisma 5, PostgreSQL
- **연동:** Firebase Authentication / Firestore, Google Calendar, Google Maps, Gemini

## 로컬 실행
외부 서비스 연결이 필요한 프로젝트입니다. 별도 개발용 PostgreSQL과 Firebase 프로젝트를 준비합니다.

```bash
git clone https://github.com/NeverBeTail/Brand-sales-crm.git
cd Brand-sales-crm
npm ci
```

루트에 `.env`를 작성합니다. 기존 `.env.example`에는 DB 설정이 빠져 있으므로 아래 항목을 함께 확인하세요.

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/brand_sales_crm"
PORT=3000
APP_URL="http://localhost:3000"
# 실제 AI 호출을 사용할 때 설정
GEMINI_API_KEY=""
# 지도 기능을 사용할 때 설정
GOOGLE_MAPS_PLATFORM_KEY=""
```

1. `firebase-applet-config.json`을 본인의 개발용 Firebase 설정으로 변경합니다.
2. Firebase Google 로그인을 설정하고 로컬 도메인, Firestore 데이터베이스 및 규칙을 확인합니다. Calendar 기능에는 해당 Google API와 접근 권한이 필요합니다.
3. `src/constants.ts`의 관리자 설정을 개발 환경에 맞게 검토합니다.
4. 아래 명령은 **별도 개발용 DB**에 스키마를 생성합니다. 서버는 빈 DB에 예시 데이터를 넣는 초기화 코드를 포함합니다.

```bash
npx prisma generate
npx prisma db push
npm run dev
```

기본 주소는 `http://localhost:3000`입니다. AI 모델 설정은 `server/routes/portal.ts`에서 확인할 수 있습니다. API 키만 설정했다고 외부 서비스의 정상 동작이 검증되는 것은 아닙니다.

## 검증 명령
```bash
npm run lint
npm run build
```
`lint`는 TypeScript 타입 검사입니다. 현재 `package.json`에는 자동 테스트 명령이 없습니다. 위 명령은 실행 안내이며 이 문서에서 빌드 통과나 운영 서비스 연결을 보증하지 않습니다.

## 코드 읽기
| 파일 | 확인할 내용 |
| --- | --- |
| [데이터 모델](prisma/schema.prisma) | 브랜드·솔루션·미팅 관계 |
| [브랜드 API](server/routes/brands.ts) | 거래처와 솔루션별 파이프라인 |
| [미팅 API](server/routes/meetings.ts) | 미팅 관리 및 캘린더 상태 |
| [AI·포털 API](server/routes/portal.ts) | 음성 요약, 이메일 초안, 포털 |
| [캘린더 훅](src/hooks/useCalendarSync.ts) | 일정 가져오기·내보내기 |
| [서버 진입점](server.ts) | 라우터 연결, SSE, 서버 실행 |

## 다음 개선 과제
- 서버에서 검증한 사용자 신원에 기반한 인증·인가 적용
- 시연용 기능과 실제 연동 기능의 UI 표시 분리
- 누락된 RAG API 구현 또는 해당 화면 범위 정리
- 핵심 CRUD와 외부 API 실패 경로에 대한 자동 테스트

[개발자 GitHub](https://github.com/NeverBeTail) · [영업 현장 관리 프로젝트](https://github.com/NeverBeTail/ncdst)
