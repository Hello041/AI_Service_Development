# 06: Neon 브랜치 분리와 Vercel 배포

**What to build:** 동아리원이 실제로 접속할 수 있는 배포 주소가 생긴다. 로컬 개발 데이터는 배포 DB와 분리되어 섞이지 않는다. 이후 티켓들은 main에 머지될 때마다 자동 배포된다. 계정·대시보드 작업이라 사람이 수행한다.

스펙: `.scratch/voting-app/spec.md` (인프라, Further Notes).

**Blocked by:** 02 (투표 만들기와 목록 보기)

**Status:** ready-for-human

- [ ] Neon에 `dev` 브랜치 생성, `.env.local`의 `DATABASE_URL`을 `dev` 브랜치 연결 문자열로 교체
- [ ] `main`·`dev` 두 브랜치에 `schema.sql` 적용 (이후 티켓에서 스키마가 바뀌면 다시 적용)
- [ ] Vercel 프로젝트 생성, 루트 디렉터리를 `voting-app`으로 지정
- [ ] Vercel 환경변수: `DATABASE_URL`(Neon `main`), `ADMIN_PASSWORD`(16자 이상 무작위), `SESSION_SECRET`(무작위)
- [ ] 배포 주소에서 운영자 로그인 → 투표 만들기 → 공유 링크로 휴대폰에서 열기 확인
- [ ] 로컬에서 만든 투표가 배포 주소에 보이지 않음을 확인
