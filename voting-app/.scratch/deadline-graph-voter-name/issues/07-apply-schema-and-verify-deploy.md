# 07: 배포 DB 스키마 적용과 배포 확인

**What to build:** 2차 기능이 배포 사이트에서 동작한다. 계정·대시보드·휴대폰 확인 작업이라 사람이 수행한다.

스펙: `.scratch/deadline-graph-voter-name/spec.md` (스키마 변경, Further Notes).

**Blocked by:** 02, 04, 06

**Status:** ready-for-human

- [ ] `npm run db:schema`로 배포 DB(Neon `production`)에 바뀐 스키마 적용 (로컬 DB가 다르면 로컬에도)
- [ ] main에 push해 Vercel 재배포
- [ ] 배포 사이트에서 이름 입력 → 헤더 표시 → 마감 시각 있는 기명 투표 만들기 → 휴대폰으로 표 던지기 → 그래프 확인 → 운영자 화면 이름 목록 확인
- [ ] 마감 시각 변경과 자동 마감 확인
