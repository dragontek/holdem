# Changelog

All notable changes to **Jack Ten Poker** are documented in this file. Versions and release notes are generated automatically from Conventional Commits on `main`.

## [1.1.0](https://github.com/dragontek/holdem/compare/v1.0.0...v1.1.0) (2026-11-27)

### Features

* **routing:** support configurable base path for GitHub Pages and subpath PWA hosting ([a2ed920](https://github.com/dragontek/holdem/commit/a2ed920ace9e99d46d2161507bf1f36350f9e311))
* **stats:** display live unfinalized session points on player stats and leaderboard ([103a3b8](https://github.com/dragontek/holdem/commit/103a3b8b3c12b70157a55726b865cc18464ec77a))

### Bug Fixes

* **director:** use live game state and latest entries on player scoring cards ([3d92265](https://github.com/dragontek/holdem/commit/3d92265f192534a336f4f23ce950b431c0442d6a))
* **scoring:** persist entry scoring metadata and preserve legacy realtime updates ([ba3e002](https://github.com/dragontek/holdem/commit/ba3e00221bb470ca97f3770aea86712377ed81f9))

### Documentation

* **agents:** define atomic commits, branching, conventional commits, and semver policies ([393e94d](https://github.com/dragontek/holdem/commit/393e94db219ad12d6bc1656950869a351367543e))

### CI / Build Pipeline

* **deploy:** add GitHub Pages DEV deploy and Appwrite Sites PROD auto-deploy ([7a6e5c8](https://github.com/dragontek/holdem/commit/7a6e5c8f1cf3fd79104d2fd674e3d6d80cfd3d13))

## 1.0.0 (2026-11-27)

### Features

* add championship seasons CRUD, SeasonManagerModal, and live active season switcher in Admin portal ([ecdce92](https://github.com/dragontek/holdem/commit/ecdce92cb36bf75e9c39c4d4316e15c8f86fba5d))
* add dedicated Admin section, RBAC for manager/dealer/scribe/player, Appwrite auth & registration, and streamline navigation ([5f18a7b](https://github.com/dragontek/holdem/commit/5f18a7b3cd2347ee1320665829dc6bc8ee1e8a99))
* add live score functions ([b552c22](https://github.com/dragontek/holdem/commit/b552c22103210cedc902a8138a225d8af91f83a6))
* add notifications, fix auth stuff ([c6b2352](https://github.com/dragontek/holdem/commit/c6b2352446359cfdcdac25518f0d2aa176907b91))
* add recurring weekly tournament event scheduling (e.g. Saturdays at 11:00 AM) ([b0d11c2](https://github.com/dragontek/holdem/commit/b0d11c287bc985b0a959fd2acb640ae61cb658be))
* add user and staff role management in Admin portal, live role modification, filtering, and user invitation modal ([b11dd01](https://github.com/dragontek/holdem/commit/b11dd01c9066cc185f7030b6a854606820e65d60))
* add Venue CRUD, Event Scheduling, walk-in seating, and live tournament persistence ([25a1c76](https://github.com/dragontek/holdem/commit/25a1c76687aa0afc105222cade0c7ffc798863c3))
* **admin:** redesign admin console into data-type dashboard with reordered tabs ([b166d35](https://github.com/dragontek/holdem/commit/b166d352f9389104db40f1f4af6603d31f1f3402))
* **announcements:** add dynamic admin-managed top banner announcements ([1b1747e](https://github.com/dragontek/holdem/commit/1b1747e9eac3c7d5f99ad0d112dd7edf9e47bcb0))
* **appwrite:** add admin-only clear & reseed with generated IDs and accurate game counts ([4f842eb](https://github.com/dragontek/holdem/commit/4f842eb37de941aeb641250fb5dafd6e1b947c16))
* **auth:** add admin role, league creation, and league manager assignment ([cfe5218](https://github.com/dragontek/holdem/commit/cfe5218fdfe10781846ad0659d549cc23065cb73))
* **auth:** harden Appwrite session lifecycle and backend RBAC guards ([fcef278](https://github.com/dragontek/holdem/commit/fcef2782ccffa6839bb7b9a7893c4f5715c33831))
* **auth:** wire up username/password signup & login with Google/Apple OAuth2 readiness ([51e78ff](https://github.com/dragontek/holdem/commit/51e78ffe24671de07d226eb6bd2cf2f2938dd94e))
* **clock:** backend-authoritative tournament timer with server clock sync ([02525b8](https://github.com/dragontek/holdem/commit/02525b8c0014b90c54926e561da47dac71e4a390))
* complete modern demo migration with league switcher, RSVP flow, rules info center, and gallery ([e7961da](https://github.com/dragontek/holdem/commit/e7961da7c4ddef3924a6d7fc88ce32a44465474d))
* **data-structure:** refactor League -> Season -> Event -> Game -> Player hierarchy and unify Player with native Appwrite Users ([6b3f837](https://github.com/dragontek/holdem/commit/6b3f8375f2534305a93871021b89fc7b86336eea))
* **director:** add unified scoring dialog, RSVP check-in, paper scorecard mode, and clock fixes ([a180619](https://github.com/dragontek/holdem/commit/a18061929a04b25941699c3ab1fe5d8f9754d553))
* **games:** enforce points-only UI, per-game ID routing, and streamlined navigation ([4b4eeee](https://github.com/dragontek/holdem/commit/4b4eeee37d8932e688259ac3ef5db7e62c36d027))
* initial commit - Hold'em League Pro with Appwrite v2.0 TablesDB integration ([21b25a0](https://github.com/dragontek/holdem/commit/21b25a014a61afceb4fed2ea330480c798b1c896))
* **notifications:** canonical viewed-game score events and 60s auto-dismiss ([05aa7d1](https://github.com/dragontek/holdem/commit/05aa7d18254c6fe9b4a16c30438a34c390746303))
* **pwa:** add installable PWA support and mobile-first responsive upgrades ([98f66a8](https://github.com/dragontek/holdem/commit/98f66a8343ed779c4802df82c6d22147ad0a5fb2))
* **rbac:** enforce role permissions across Director Desk, Games, and Admin UI ([43c39f7](https://github.com/dragontek/holdem/commit/43c39f73112e12fd3731d43bb499a25b28f04587))
* redesign Admin Console with segmented tabs, executive KPI metrics, and integrated Event Schedules management ([71d0ac7](https://github.com/dragontek/holdem/commit/71d0ac737eec0f3430c796e2cd2a5f0924c12c1f))
* **routing:** add shareable prefix routes, session-persisted league, and Jack Ten Poker branding ([916ccc8](https://github.com/dragontek/holdem/commit/916ccc8498bcda92a9cac1ca908d631550e15bd1))
* **scoring:** auto-award Show Up points (+600) at the 1:15 mark ([f39a56e](https://github.com/dragontek/holdem/commit/f39a56e507581d72cf15d37a17487c649ba0a08d))
* **scoring:** implement Jack Ten Poker scoring rules, blind schedule, and seed fixtures ([809bbfc](https://github.com/dragontek/holdem/commit/809bbfcd1e11ba2d2b9820d84fc3bbd2e97cf235))
* **staff:** select dealers and scribes from database accounts and harden user normalization ([95aa500](https://github.com/dragontek/holdem/commit/95aa5007a0c67c7633b8bb4ec80e6d58516b953a))
* synchronize browser history and popstate navigation, wire up in-app back buttons and player card links ([1496304](https://github.com/dragontek/holdem/commit/1496304dd6ecc312dbe89f16c19feb61372c3922))
* **venues:** add official scorecard venues and Appwrite Storage photo uploads ([9ba92dd](https://github.com/dragontek/holdem/commit/9ba92dd9a8f7a32b72a2a96721c0281575e8479d))

### Bug Fixes

* **appwrite:** add resilient schema filtering, Realtime v2 migration, and league/game persistence ([bf14046](https://github.com/dragontek/holdem/commit/bf14046ad9f0eb0fc480340d4ba17b4b15ac8c7e))

### Code Refactoring

* apply shadcn guidelines, decompose AdminView into modular sections, and migrate modals to Radix Dialogs ([36d4313](https://github.com/dragontek/holdem/commit/36d43136fe56081524f3c45a64cf20dd9d9f3a05))

### Documentation

* generate AGENTS.md with anti-ai-slop standards and shadcn framework foundation ([88747dc](https://github.com/dragontek/holdem/commit/88747dcf286b034d48faf12deda324c0034fe21d))

### CI / Build Pipeline

* **release:** add Conventional Commits CI and semantic-release pipeline ([0d851a9](https://github.com/dragontek/holdem/commit/0d851a96e8feec1fff342fd3c26825cb140a4bae))

### Build System

* add bundle:site script for Appwrite Sites manual deployment ([f859a88](https://github.com/dragontek/holdem/commit/f859a88c6e50f579856f8886320fa839f4956504))
