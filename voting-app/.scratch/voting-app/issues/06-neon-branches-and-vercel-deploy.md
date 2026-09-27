# 06: Neon 브랜치 분리와 Vercel 배포

**What to build:** 동아리원이 실제로 접속할 수 있는 배포 주소가 생긴다. 로컬 개발 데이터는 배포 DB와 분리되어 섞이지 않는다. 이후 티켓들은 main에 머지될 때마다 자동 배포된다. 계정·대시보드 작업이라 사람이 수행한다.

스펙: `.scratch/voting-app/spec.md` (인프라, Further Notes).

**Blocked by:** 02 (투표 만들기와 목록 보기)

**Status:** done (로컬·배포 DB 분리는 미완 — 아래 참고)

- [ ] Neon에 `dev` 브랜치 생성, `.env.local`의 `DATABASE_URL`을 `dev` 브랜치 연결 문자열로 교체
- [x] 배포에 쓰는 브랜치에 `schema.sql` 적용 (`npm run db:schema`)
- [x] Vercel 프로젝트 생성, 루트 디렉터리를 `voting-app`으로 지정
- [x] Vercel 환경변수: `ADMIN_PASSWORD`, `SESSION_SECRET` 직접 입력, `DATABASE_URL`은 Neon 연동(Link Existing Neon Account)으로 자동 추가
- [x] 배포 주소에서 화면이 뜨는 것 확인
- [ ] 로컬에서 만든 투표가 배포 주소에 보이지 않음을 확인

## Comments

2026-09-28: 배포 완료. Neon 연동이 `production`(기본)과 `vercel-dev` 브랜치를 쓴다. 로컬 `.env.local`도 `production` 브랜치를 가리키는 것으로 보여, 지금은 로컬과 배포가 같은 DB를 쓴다. 로컬 전용 `dev` 브랜치를 만들어 `.env.local`을 옮기면 남은 두 항목이 끝난다. 이후 스키마를 바꾸면 `production` 브랜치에도 `npm run db:schema`를 다시 적용해야 한다.
