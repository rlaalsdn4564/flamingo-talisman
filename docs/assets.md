# 자산 제작 기록

모든 아래 그림은 2026-09-07 내장 `image_gen` 도구로 생성한 프로젝트용 자산이다. 외부 API 키나 별도 이미지 API를 사용하지 않았다. 원작 스크린샷은 구도 확인에만 쓰고 생성 입력·런타임·공개 저장소에 포함하지 않았다.

| 파일                           | 용도                               | 처리                                                                 |
| ------------------------------ | ---------------------------------- | -------------------------------------------------------------------- |
| `public/art/shrine.png`        | 새벽의 신사/산수 전투 배경         | 1536×1024 생성 원본                                                  |
| `public/art/portraits.png`     | 전사 선택·상단 초상·행동 카드·컷인 | 1536×1024, 네 전사 원화 띠를 CSS로 구역별 사용                       |
| `public/art/warriors-key.png`  | 실제 전투판 전신 스프라이트        | 원화의 배경만 자홍색으로 다시 생성, Canvas에서 키 색을 투명하게 렌더 |
| `public/fonts/Galmuri11.woff2` | 한국어 게임 UI                     | [SIL OFL](../public/fonts/OFL.md), 기존 로컬 프로젝트의 동일 파일    |

투명 배경 요청이 실제 alpha 없는 배경을 반환하여 그 파일은 사용하지 않는다. 이후 이미지 도구로 배경을 RGB #FF00FF 계열 크로마키 색으로 바꾸었다. `src/render.mjs`의 `isKeyColor()`가 런타임에서 해당 색만 제거한다. 흰 깃털·주홍 옷을 보존하는 회귀 테스트가 있다. 원본 캐릭터 그림에 후처리 모델/외부 라이브러리를 적용하지 않는다.

## 최종 프롬프트

### 신사 배경

Use case: stylized-concept. Final game environment background, landscape 1536x1024. Original hand-painted cel-animation background for a nostalgic early-2000s Japanese supernatural tactics browser game starring flamingo yokai. Wide elevated view of an abandoned mountain shrine courtyard at misty blue dawn: weathered vermilion torii and stone lantern at upper left, dense brush-painted bamboo upper right, pale river and layered craggy blue-gray mountains. Lower 65 percent broad flat gray stone courtyard earth with subtle natural texture, clear playable negative space for an overlaid 5x5 tactical board. Rich ink outlines and painted gouache texture. Desaturated midnight-teal, rust red, antique gold. No characters, text, logo, cards, UI, grid, watermark.

### 네 전사 원화

Use case: stylized-concept. Finished original character sprite atlas. Wide 1536x1024, four equal-width columns with one full-body original anthropomorphic flamingo yokai warrior each, soles aligned. Left to right: coral-pink swordswoman in short vermilion robe and indigo hakama with feather-shaped silver sword; pale-pink shrine archer in cream tunic, moss-green hakama, woven hat and vertical bamboo bow; compact rust-red mountain monk in charcoal robes, ochre scarf, brass ring staff; white-and-crimson storm spirit in navy feather mantle, lacquered shoulders, paper talismans and crescent spear. Sharp avian eyes, curved beaks, elegant S-shaped necks, feathered arms. Premium early-2000s anime cel illustration, ink contour, cel shadows, poised three-quarter stance facing right. No existing anime character, copied emblem, text, frame, logo, watermark.

### 런타임 크로마키판

Edit the original four-warrior image. Change only the background. Keep four warriors unchanged with identical positions, full bodies, clothing, weapons and feather detail. Replace all gradient backdrop and spaces between characters/weapons with one completely flat untextured bright chroma key magenta RGB 255,0,255 / #FF00FF. No gradient, shadow, texture, checkerboard or transparency. Do not add magenta to characters. Keep 1536x1024. No text or frames.

## 소리

버튼/이동에는 짧은 사인 파형, 공격에는 짧은 삼각 파형을 Web Audio로 합성한다. 음악·성우 음성·원작 효과음을 포함하지 않는다. 소리는 기본 꺼짐이고 플레이어가 켜야 재생한다.
