# Vue.js 종합실습 과제 — 날씨 정보 웹앱

SKALA 4기 Vue.js 과제입니다. 교재의 필수 실습과 Code Challenge는 `src/components/practices/`에
그대로 보존하고, 제출 대상인 날씨 앱은 `src/components/exercise/`와 `src/views/`로 분리했습니다.
한 화면에 섞지 않고 `App.vue`의 모드 스위처로 전환합니다.

아래 내용은 **현재 저장소의 코드와 검증 스크립트로 확인할 수 있는 범위만** 설명합니다.

- **저장소**: <https://github.com/zinzin1011/skala-vue>
- **배포 주소**: <https://zinzin1011.github.io/skala-vue/>

## 3분 확인 경로

```sh
npm install
cp .env.example .env      # OpenWeatherMap 키 입력
npm run dev
```

| 순서 | 확인할 것 | 이동 방법 |
| ---: | --- | --- |
| 1 | 과제 / 실습 전환 | 화면 우상단 `📘 과제` / `🧪 실습` |
| 2 | 과제 1\~5 단계별 결과물 | 과제 모드 상단 `📂 과제 선택` 드롭다운 |
| 3 | 실시간 날씨 · 상세 모달 | `과제 5` → 카드의 `상세 날씨 보기` |
| 4 | 지역 검색·추가·삭제 | `과제 5` → `+ 지역 추가` → 도시명 입력 |
| 5 | **초성 검색** | 검색창에 `ㅅㅇ` 입력 → 서울·수원 |
| 6 | 다크모드 · 단위 전환 | 우상단 토글 / `과제 5` 상단 `℃↔℉` |
| 7 | 전체 로직 검증 | `npm run verify` (47개) |

---

## 과제 요구사항 대응

### 종합실습 ①\~⑨ (Day 1\~3)

실습 ④\~⑨는 화면을 새로 만들지 않고 **라우터 블록 하나를 계속 고쳐 나가는** 구조입니다
(Day3-3 가이드: "같은 라우터 블록을 계속 고칩니다. 새 블록을 만들지 않습니다").
그래서 과제 모드의 블록은 아래 **4개**입니다.

| 블록 | 화면 | 구현 내용 | 구현 파일 |
| --- | --- | --- | --- |
| 과제 1 | 날씨 (Mockup) | Mock 배열 + `v-for`/`:key`, 검색어·alert 실습 | `WeatherMockup.vue` |
| 과제 2 | 날씨 (컴포지션) | Options → **Composition API** 전환, `ref`/`computed` | `WeatherComposition.vue` |
| 과제 3 | 날씨 (컴포넌트) | **Component 분리** — Props ↓ / Emit ↑ | `WeatherParent.vue` 외 3개 |
| 과제 5 | 스토어 적용 | **Router**(④) + **Pinia**(⑤) + **Axios 실 API**(⑥\~⑨)를 한 블록에 누적 | `WeatherHomeView.vue` 외 |

화면에서도 이 사실을 알 수 있도록 과제 5 제목 아래에 무엇이 누적됐는지 표기했습니다.
제목만 보면 스토어만 적용한 것처럼 보이기 때문입니다.

> 과제 6(Axios × OpenWeatherMap 별도 화면)은 한때 별도 블록으로 존재했지만, 위 지침에 따라
> 과제 5 블록에 OpenWeatherMap을 직접 병합해 요구사항을 충족하고 제거했습니다.
> 실습 모드의 `AxiosWeather.vue`와도 중복이었습니다. (`ExerciseApp.vue` 주석 참고)

### 빌드와 배포 (Day 4-3 · 교재 278쪽)

| # | 요구사항 | 대응 | 확인 방법 |
| --- | --- | --- | --- |
| ① | ESLint Error 0건 | `eqeqeq` 규칙 추가 후 전수 수정 | `npm run lint` |
| ② | API 키 환경변수 분리 | `import.meta.env.VITE_OPENWEATHER_API_KEY` | `git grep -E "[0-9a-f]{32}" -- src` → 0건 |
| ③ | Project Build | 라우터 지연 로딩으로 청크 분리 | `npm run build` → `dist/assets/` |
| ④ | 정적 호스팅 | `gh-pages` + `base: '/skala-vue/'` | `npm run deploy` |

### Code Challenge

| # | 항목 | 위치 |
| --- | --- | --- |
| ① | ESLint 커스텀 규칙 | `eslint.config.js` — `eqeqeq: 'error'`, `no-console: 'off'` |
| ② | Prettier 포맷 | `.prettierrc.json` (`semi: false`, `singleQuote: true`, `printWidth: 200`) |
| ③ | 모드별 환경변수 | `.env.staging` / `.env.production` + `build:staging` / `build:production` |
| ④ | 빌드 결과 확인 | `dist/assets/`의 해시 파일명, 라우트별 분리 청크 |

---

## p.158 필수 Component 분리

Mock 데이터와 검색·선택·상세 alert 동작을 유지한 채 4개 컴포넌트로 나눴습니다.

| Component | 책임 |
| --- | --- |
| `WeatherParent.vue` | 모든 반응형 데이터와 검색·선택·상세 동작 소유 |
| `BaseDashboardCard.vue` | 검색·목록의 공통 카드 레이아웃과 `<slot>` 제공 |
| `SearchBar.vue` | 검색어 Props 수신, `update-query` Emit |
| `WeatherCard.vue` | 도시 Props 수신, `select-card`·`click-detail` Emit |

상세 버튼은 `@click.stop`으로 카드 선택 이벤트의 버블링을 막습니다.
과제 5 전용 카드(`WeatherCardDetailed.vue`)는 **과제 3 화면이 깨지지 않도록** `WeatherCard.vue`를
그대로 두고 새로 만들었습니다.

## Store를 나눈 기준

| Store | 맡은 상태 | 사용 이유 |
| --- | --- | --- |
| `configStore` | `unit` / `unitSymbol` / `isDarkMode` | 단위와 테마를 여러 화면이 공유 |
| `counter` | `count` / `doubleCount` / `increment` | Pinia state·getter·action 교재 실습 |

p.158의 반응형 데이터는 조건대로 `WeatherParent.vue`에 남겼습니다.
**여러 화면이 공유해야 하는 상태만** Store로 옮겼습니다.

---

## 필수 실습에서 확장한 부분

요구사항 외에 직접 판단해 넣은 기능들입니다.

### 검색 · 입력 편의

| 확장 | 추가한 이유 | 구현 파일 |
| --- | --- | --- |
| **초성 검색** | `ㅅㅇ`만 입력해도 서울·수원을 찾도록. 과제 2에서 만든 뒤 과제 5로 이식 | `utils/chosung.js` |
| 지역 검색·추가·삭제 | 고정 3개 도시만으로는 실사용 가치가 없어 임의 도시를 담을 수 있게 확장 | `composables/useCityAddition.js` |
| 한글 조사 자동 선택 | "대구이 지금 맑음" 같은 어색한 문장을 없애기 위해 받침 유무로 이/가 선택 | `utils/josa.js` |
| 검색 상태 URL 동기화 | 타이핑에 맞춰 `?search=` 쿼리를 갱신하고, 진입 시 복원 | `WeatherHomeView.vue` |

### 화면 구성 개선

| 개선 | 이전 상태 | 바꾼 이유 |
| --- | --- | --- |
| 과제 선택 드롭다운 | 과제 1\~5가 세로로 전부 나열 | 화면이 너무 길어 원하는 과제를 찾기 어려움 |
| 다크모드 토글 위치 | 과제 5 화면 안에만 존재 | 그 화면을 보고 있을 때만 테마를 바꿀 수 있는 건 부자연스러움 → 항상 보이는 우상단으로 이동 |
| `+ 지역 추가` 접기 | 추가 카드가 항상 펼쳐짐 | 화면을 과하게 차지해 기본 닫힘 + 버튼 토글로 변경 |
| 상세 화면 → 모달 | 라우터 페이지 이동 | 카드 목록으로 돌아올 때 스크롤·검색 상태가 초기화되어 모달로 전환 (라우트와 `WeatherDetailView.vue`는 라우팅 시연용으로 보존) |
| 글래스모피즘 테마 | 기본 스타일 | 날씨 앱에 맞는 시각적 톤 정리 |
| 문서 제목·언어 | `<title>Vite App</title>`, `lang=""` | 브라우저 탭에서 앱을 식별할 수 있도록 한국어 제목과 `lang="ko"`로 교체 |

### 데이터 정확도

- **행정구역 표기 보정** — 지오코딩 결과가 "울산 → 경상북도"처럼 옛 정보를 주는 사례가 있어,
  대한민국 8개 특별시·광역시는 정식 명칭으로 고정합니다. 실재하지 않는 광역명(예: 확정된 적 없는
  통합시 명칭)은 아예 표시하지 않습니다. (`isTrustedKoreaRegionName`)
- **표기 통일** — Nominatim이 주는 "수원시"·"울산광역시"를 기본 도시와 같은 짧은 이름으로
  정규화합니다. '광주'·'경주'처럼 접미사와 겹치는 지명을 훼손하지 않도록 화이트리스트 방식을
  씁니다. 일본 지명(도쿄도 → 도쿄)까지 확장했습니다. (`normalizeKoreanCityName`)
- **검색 관련성 필터** — "경주"를 검색했는데 무관한 "천안"이 함께 뜨던 문제를 해결했습니다.
  전체 주소 문자열 대신 **실제로 화면에 보여주는 이름만** 비교하도록 좁혔습니다. (`isRelevantToKeyword`)
- **자외선지수 보완** — OpenWeatherMap 무료 요금제에 없는 값이라, 키가 필요 없는 Open-Meteo로
  이 필드만 채웁니다.
- **미세먼지 범위 확대** — 처음엔 국내 지역에만 표시해 카드마다 4번째 항목이 서로 달랐습니다.
  Open-Meteo Air Quality가 CAMS 전지구 모델을 쓰므로 해외도 데이터가 있어, 전 지역으로 넓혀
  카드 구성을 통일했습니다.

### 상태 유지

새로고침하면 처음 화면으로 돌아가던 것들을 `localStorage`에 저장해 복원합니다. (`utils/storage.js`)

| 저장 대상 | 키 |
| --- | --- |
| 과제 / 실습 모드 | `skala-vue:mode` |
| 마지막으로 본 과제 | `skala-vue:selectedTask` |
| 검색으로 추가한 지역 | `skala-vue:addedCities` |

추가 지역은 **날씨 값을 저장하지 않고 도시의 정체성(이름·좌표)만** 저장합니다.
낡은 기온을 보여주지 않기 위해서이고, 마운트 시 어차피 다시 조회합니다. 저장량이 무한정 늘지
않도록 최대 개수도 제한했습니다.

---

## 직접 발견하고 고친 문제

과제를 진행하며 마주친 버그와 원인입니다.

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 다크모드 버튼만 스타일이 깨짐 | `App.vue`의 scoped 스타일에서 `button` element selector를 쓰면, Vue가 부모 scope 속성을 자식 컴포넌트의 **단일 루트 엘리먼트**에 붙이기 때문에 `ThemeToggler`의 루트 `<button>`에도 규칙이 적용됨 | 전용 클래스 `.mode-btn`으로 한정 |
| 과제를 옮겼다 돌아오면 추가한 지역이 사라지고 API 재호출 | `v-if`가 컴포넌트를 언마운트/재마운트 | `v-show`로 변경 (DOM은 유지, 표시만 숨김) |
| 과제 5 카드가 계속 "불러오는 중" | 정적 mock에 `tempC`·`windSpeed` 등 카드가 기대하는 필드가 없음 | 실시간 API 연동으로 교체 |
| 도시를 추가해도 새로고침이 안 됨 | 갱신을 **도시 이름** 기준으로 해서, `CITY_LIST`에 없는 추가 도시는 대상에서 누락 | **좌표(lat/lon) 기준**으로 변경 |
| `npx eslint .` 실행 시 에러 228개 | Vite 사전 번들링 캐시(`.vite/`)를 소스로 착각해 검사 | `globalIgnores`에 `**/.vite/**` 추가 |
| 검증 스크립트 실행 시 크래시 | 순수 Node 환경에서는 `import.meta.env` 자체가 `undefined` | 옵셔널 체이닝으로 방어, 키 부재는 호출 시점에 확인 |
| 초성 검색이 필터를 그냥 통과 | 한글 판정 정규식이 완성형(`가-힣`)만 보고 초성 자모(`ㄱ-ㅣ`)를 제외 | 정규식 범위 확장 |

---

## API 요청을 줄인 방식

| 사용자 행동 | 새 요청 | 적용한 제어 |
| --- | ---: | --- |
| 같은 좌표를 10분 내 재조회 | 0 | TTL 캐시 (`CURRENT_WEATHER_TTL_MS`) |
| 여러 화면이 같은 도시를 동시 조회 | 1 | 진행 중인 Promise 공유 (중복 요청 통합) |
| 같은 검색어 반복 입력 | 0 | 검색 결과 캐시 (`cityGeocodingCache`) |
| 새로고침 버튼 클릭 | 전체 | `forceRefresh: true`로 캐시 무시 |

그 밖의 비동기 처리:

- **부분 실패 허용** — `Promise.allSettled`로 도시 하나가 실패해도 나머지는 갱신하고,
  실패한 카드는 직전 값을 유지하며 실패 개수를 안내합니다.
- **경쟁 상태 방어** — 검색어를 연달아 입력할 때 요청 ID로 순서를 추적해, 늦게 도착한 이전
  응답이 최신 결과를 덮어쓰지 못하게 막습니다.

---

## 검증

```sh
npm run verify
```

외부 테스트 프레임워크 없이 Node 내장 `assert`로 **47개 항목**을 검사합니다
(`scripts/verify-weather-logic.mjs`).

| 검사 그룹 | 대상 |
| --- | --- |
| `mapWeatherCodeToStatus` | WMO 코드 → 날씨 상태 매핑 |
| `pickHourlyUvIndex` / `pickHourlyValueAt` | hourly 배열에서 현재 시각 값 추출 |
| `formatTimeOfDay` / `unixToLocalTimeOfDay` | 일출·일몰 시각 변환 (유닉스 + 시간대 오프셋) |
| `mapPm10ToGrade` | 미세먼지 등급 (환경부 기준) |
| `coordsCacheKey` | 캐시 키 = 중복 요청 통합의 기준 |
| `normalizeKoreanCityName` | 한국·일본 지명 표기 통일 |
| `isTrustedKoreaRegionName` | 신뢰할 수 없는 행정구역명 차단 |
| `chosung` | 초성 검색 |
| `josa` | 받침 유무에 따른 이/가 선택 |
| `isRelevantToKeyword` | 검색 결과 관련성 필터 |
| 기본 도시 목록 무결성 | `CITY_LIST` ↔ `CITY_COORDS` 정합성 |

화면 동작(검색, 다크모드, 새로고침)은 `npm run dev`로 직접 실행해 육안 확인했습니다.

---

## 프로젝트 구조

```
src/
├── App.vue                    # 과제/실습 모드 스위처 + 다크모드 토글
├── ExerciseApp.vue            # 과제 블록 4개 (드롭다운 선택, v-show 유지)
├── PracticeApp.vue            # 교재 실습 모음
├── components/
│   ├── exercise/              # 제출 대상 컴포넌트 (10개)
│   └── practices/             # 교재 실습 (제출 블록 아님, 47개)
├── views/                     # 라우터 화면 (Home·Detail·About·NotFound)
├── router/index.js            # 라우팅 + 지연 로딩
├── stores/
│   ├── configStore.js         # 단위·다크모드
│   └── counter.js             # Pinia 교재 실습
├── services/
│   ├── openWeatherApi.js      # OpenWeatherMap (기본 3개 도시)
│   └── weatherApi.js          # Open-Meteo + Nominatim (검색 추가 도시)
├── composables/useCityAddition.js
└── utils/                     # chosung · josa · storage
```

## 사용 API

| API | 용도 | Key |
| --- | --- | --- |
| **OpenWeatherMap** | 기본 3개 도시의 현재 날씨 + 예보 + 대기질 (3개 엔드포인트 조합) | 필요 |
| **Open-Meteo Forecast** | 검색 추가 도시의 날씨, 기본 도시의 자외선지수 보완 | 불필요 |
| **Open-Meteo Air Quality** | 미세먼지 (PM10 / PM2.5) | 불필요 |
| **OpenStreetMap Nominatim** | 도시 이름 → 위경도 검색 | 불필요 |

---

## 실행과 배포

```sh
npm install
npm run dev          # 개발 서버
npm run lint         # oxlint + eslint (에러 0건)
npm run format       # Prettier 일괄 정렬
npm run verify       # 핵심 로직 47개 검증
npm run build        # 프로덕션 빌드 → dist/
npm run deploy       # 빌드 + gh-pages 브랜치 푸시
```

배포 후 저장소 **Settings → Pages**에서 브랜치를 `gh-pages` / `(root)`로 지정합니다.
`vite.config.js`의 `base`는 저장소 이름(`/skala-vue/`)과 일치해야 하며, 다르면 흰 화면이 뜹니다.

## 보안과 현재 한계

- **`VITE_` 값은 브라우저 번들에 포함되므로 완전한 비밀키가 아닙니다.** `.env`의 목적은 소스
  저장소 유출을 막고 환경별로 값을 바꿔 끼우는 것입니다. 실무에서는 키를 백엔드에 두고 프론트가
  그 서버를 호출합니다.
- 캐시와 중복 요청 통합은 같은 브라우저 탭 안에서만 동작합니다. 서비스 전체 quota 관리는
  백엔드 또는 serverless proxy의 rate limit이 필요합니다.
- GitHub Pages는 SPA 라우팅을 지원하지 않아 `/skala-vue/about`처럼 주소를 직접 입력하면 404가
  납니다. 메인에서 링크로 이동하면 정상입니다.
- 자동화된 E2E·브라우저 테스트는 포함하지 않았습니다. `npm run verify`는 순수 로직만 검증하며,
  실제 API 응답 형태는 개발 서버에서 수동 확인했습니다.
- Nominatim은 사용 정책상 초당 1회 수준의 호출만 권장합니다. 검색은 버튼 클릭 시에만 호출하고
  결과를 캐시하므로 정상 사용 범위에서는 문제가 없지만, 대량·자동화된 호출에는 별도 프록시가
  필요합니다.
- 동명 지역이 많으면 원하는 도시가 상위에 없을 수 있습니다. 다만 대한민국 8개 특별시·광역시는
  정식 명칭으로 고정 보정하므로 해당 사례는 재발하지 않습니다.
