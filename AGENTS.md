# AGENTS.md

Phaser 4 + Vite + TypeScript のゲームテンプレート。AI コーディングエージェント向けの作業指針。

## プロジェクト構成

```
index.html            エントリ HTML。#game-container に canvas が入る
vite.config.ts        Vite 設定
tsconfig.json         TypeScript 設定（strict）
public/               そのまま配信される静的アセット置き場
src/
  main.ts             GameConfig と Game インスタンスの生成、HMR 処理
  scenes/
    HelloScene.ts     'Hello, world!' を表示するだけのシーン
```

## コマンド

- `npm run dev` — 開発サーバー起動（HMR 有効）
- `npm run build` — `tsc --noEmit` の後に `dist/` へ本番ビルド
- `npm run typecheck` — 型チェックのみ

コードを変更したら `npm run typecheck` を通すこと。

## 規約

- Phaser 4 系（v3 ではない）。v3 の API をそのまま書かないこと
- シーンは `src/scenes/` に 1 ファイル 1 クラスで置き、`src/main.ts` の `scene` 配列に登録する。配列の先頭が最初に起動する
- アセットは `public/` に置き、ルート直下からのパスで読む（例: `this.load.image('logo', 'logo.png')`）
- TypeScript は strict。`any` を使わずに Phaser の型を使う

## Phaser 公式スキルドキュメント（重要）

`npm install` 済みなら、Phaser 4 の全サブシステムについて公式が書いた詳細ドキュメントがローカルに存在する。

```
node_modules/phaser/skills/<トピック>/SKILL.md
```

各ファイルには API のクイックスタート、実際に動くコード例、設定リファレンス、よくある間違い（Gotchas）、v3 からの変更点、ソースファイルの対応表が含まれる。

**Phaser の API を書く前に、該当トピックの SKILL.md を必ず読むこと。** モデルの記憶に頼って v3 の API を書いてしまう事故を防げる。読むのは関係するトピックだけでよい。

### トピック一覧

- `game-setup-and-config` — `new Phaser.Game`、GameConfig、レンダラー、ピクセルアート、FPS
- `scenes` — シーンのライフサイクル、遷移、並列シーン、SceneManager
- `sprites-and-images` — Sprite / Image、テクスチャ、tint、flip、origin、depth
- `text-and-bitmaptext` — Text / BitmapText、Web フォント、word wrap
- `graphics-and-shapes` — Graphics、線・矩形・円・多角形、グラデーション
- `loading-assets` — Loader、画像 / スプライトシート / アトラス / 音声 / JSON、進捗
- `animations` — スプライトアニメーション、AnimationManager、フレームイベント
- `tweens` — Tween、イージング、チェーン、stagger、yoyo
- `input-keyboard-mouse-touch` — キーボード、マウス、タッチ、ドラッグ＆ドロップ、ゲームパッド
- `physics-arcade` — Arcade Physics、速度、重力、衝突、オーバーラップ
- `physics-matter` — Matter.js、剛体、拘束、センサー
- `cameras` — カメラ効果（shake / fade / pan / zoom）、追従、ミニマップ
- `scale-and-responsive` — ScaleManager、FIT / RESIZE / EXPAND、フルスクリーン
- `tilemaps` — Tiled JSON マップ、タイルレイヤー、タイル衝突
- `particles` — ParticleEmitter、放出ゾーン、パーティクル挙動
- `audio-and-sound` — 音声の読み込みと再生、音量、空間音響
- `time-and-timers` — TimerEvent、delayedCall、Clock、タイムスケール
- `events-system` — EventEmitter、シーンイベント、カスタムイベント
- `data-manager` — setData / getData、データ変更イベント
- `groups-and-containers` — Group、Container、オブジェクトプール
- `game-object-components` — Transform / Alpha / Tint / Mask などのコンポーネント
- `geometry-and-math` — Vector2、Rectangle、Circle、乱数、角度、補間
- `curves-and-paths` — スプライン、ベジェ、パスフォロワー
- `filters-and-postfx` — bloom、blur、glow、カラーマトリクス、カスタムシェーダー
- `render-textures` — RenderTexture、DynamicTexture、スナップショット
- `actions-and-utilities` — 整列、グリッド配置、オブジェクト群への一括操作
- `v4-new-features` — v4 の新機能（Filters、SpriteGPULayer、Gradient、Noise ほか）
- `v3-to-v4-migration` — v3 からの破壊的変更と移行手順

### 使用例

タイルマップにキャラクターを歩かせる機能を追加する場合、コードを書く前に以下を読む。

```
node_modules/phaser/skills/tilemaps/SKILL.md
node_modules/phaser/skills/physics-arcade/SKILL.md
node_modules/phaser/skills/animations/SKILL.md
```
