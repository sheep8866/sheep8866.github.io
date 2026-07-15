# MEMORY

## 설정
- GitHub Pages 주소: `https://qvkill-create.github.io`
- GitHub 저장소: `https://github.com/qvkill-create/qvkill-create.github.io.git`
- GitHub 토큰 파일: `github_token.txt`
- 프로필 참고 자료: 없음
- 웹사이트 디자인 참고: `인스타그램의 개인 프로필 페이지` [사람 확인 필요: 구체적 레이아웃]
- 게임 추가 기능: `랜덤하고 활발하게 움직이는 적 - 5초 마다 폭발함, 다시 폭발하면 랜덤하게 생성되어서 랜덤하게 움직임`

## 실행
- Mode: `CODEX_FALLBACK`
- Claude model: `claude-sonnet-5`
- Current commit: `0dfca909ca464909b89e52c08c27abd6bb889134`
- Last known stable URL: `https://qvkill-create.github.io`
- Git state: 저장소는 `main` 브랜치이며, 문서 변경분은 현재 작업 트리에 반영된 상태다
- Rollback 기준: `index.html`, `styles.css`, `script.js`, `CHANGE_REQUEST.md`, `AORR_LOG.md`, `AORR.md`, `MEMORY.md`의 마지막 변경만 되돌린다

## 현재 상태
- 홈, About, Projects, Experience, Research, Contact, Games 구조를 유지하면서 `지렁이 게임` 옆에 `테트리스 게임`을 추가했다.
- 두 게임 모두 키보드 입력으로 동작하고, 마지막으로 선택한 게임이 입력을 받는다.
- 지렁이 게임은 시작, 이동, 음식, 성장, 점수, 충돌, 게임 오버, 일시정지, 재시작, 최고 점수 흐름을 넣었다.
- 테트리스 게임은 좌우 이동, 회전, 하드 드롭, 일시정지, 재시작, 점수, 줄, 레벨 흐름을 넣었다.
- 배포 커밋은 `0dfca909ca464909b89e52c08c27abd6bb889134`이고, `https://qvkill-create.github.io`가 `200 OK`로 응답한다.
- 다음 단계는 새 변경분을 커밋하고 다시 배포하는 일이다.

## 최근 루프
| 루프 | 상태 | 실행 모드·모델 | 변경 파일 | 테스트 | Retry | 다음 작업 |
|---|---|---|---|---|---|---|
| 1 | 완료 | `CODEX_FALLBACK` / `claude-sonnet-5` | `index.html`, `script.js`, `styles.css` | 배포 완료 | 0 | step8/9 문서와 로그 반영 |
| 2 | 진행중 | `CODEX_FALLBACK` / `claude-sonnet-5` | `index.html`, `styles.css`, `script.js`, `AORR_LOG.md`, `MEMORY.md` | `node --check` 통과 | 0 | 커밋 후 재배포 |

## 주의
- 확인되지 않은 정보는 `[`사람 확인 필요`]`로 유지한다.
- 테스트 삭제나 완화는 하지 않는다.
- 배포와 커밋은 승인 지점에서만 진행한다.
