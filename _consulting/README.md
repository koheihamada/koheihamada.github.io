# 伴走コンサル（仮称）LP

公開URL：`https://www.basic-fnb.com/consulting/`

| 場所 | 役割 | 公開 |
|---|---|---|
| `_consulting/config.json` | サービス名・色・実績数値・店舗・FAQ・フォーム送信先・GA などの設定 | されない |
| `_consulting/src/` | ページのテンプレート・CSS・JS・画像 | されない |
| `_consulting/build.py` | 上の2つから `/consulting/` を生成 | されない |
| `_consulting/gas/Code.gs` | フォームの受付（Google Apps Script） | されない |
| `consulting/` | **生成物**。直接編集しない | される |

`_` で始まるフォルダは GitHub Pages で公開されません。

## 更新のしかた

```
python3 _consulting/build.py
```

`config.json` か `src/` を編集したら、必ず実行してから commit します。
サービス名・数字・FAQ・店舗などは `config.json` だけを直せば、本文・タイトル・構造化データ・llms.txt に反映されます。

## フォームを動かす（公開前に必須）

1. Google スプレッドシートを新規作成 →「拡張機能 > Apps Script」に `gas/Code.gs` を貼り付けて保存
2. 「プロジェクトの設定 > スクリプト プロパティ」に登録
   - `NOTIFY_TO`：通知先メールアドレス（カンマ区切りで複数可）
   - `SERVICE_NAME`：サービス名
   - `REPLY_FROM_NAME`：自動返信の差出人名
3. 「デプロイ > 新しいデプロイ > 種類：ウェブアプリ」
   - 実行ユーザー：自分 / アクセスできるユーザー：全員
4. 発行された URL を `config.json` の `endpoint` に入れてビルド
5. 本番でテスト送信し、スプレッドシートへの記録・通知メール・受付確認メールを確認

スパム対策：ハニーポット項目、入力開始から3秒未満の送信を拒否、同じメールアドレスからの10分以内の連投を拒否、サーバー側の入力検証、スプレッドシートの数式インジェクション対策。
スパムが増えた場合は Cloudflare Turnstile などの追加を検討。

## 計測（GA4）

`page_view` に加えて、次のイベントを送信します。

| イベント | タイミング | パラメータ |
|---|---|---|
| `cta_click` | 相談ボタンのクリック | `cta_position`（header / fv / how / services / flow / sticky） |
| `form_start` | フォームへの初回入力 | — |
| `form_submit` | 送信ボタン（入力チェック通過後） | `stores`, `topics` |
| `form_success` | 受付完了 | `stores`, `topics` |
| `form_error` | 入力エラー・送信失敗 | `reason` |
| `faq_open` | FAQ を開いた | `question` |

UTM パラメータ（`utm_*`, `gclid`）・ランディングURL・リファラはセッション中保持し、フォームと一緒にスプレッドシートへ記録します。
GA4 の管理画面で `form_success` をキーイベントに設定してください。
Google 広告を使う場合は `ads_conversion_send_to`（例：`AW-XXXX/XXXX`）を設定します。

## 正式公開の手順

1. 下の「公開前の確認事項」をすべて確定
2. `config.json` の `noindex` を `false` にしてビルド
3. ルートの `sitemap.xml` に `https://www.basic-fnb.com/consulting/` を追加
4. Google Search Console で URL 検査 → インデックス登録をリクエスト

## 公開前の確認事項（未決定）

- [ ] 正式サービス名・ロゴ（今は仮のロゴマークとワードマーク）
- [ ] 成果報酬の料金・契約条件（報酬率・上限・測定期間）
- [ ] 成果の算定方法・調整方法（季節変動・新規出店など）
- [ ] 実費負担・例外事項・契約終了条件
- [ ] 成果報酬型の事前審査の基準
- [ ] 自社実績の数値（8ブランド＝展開予定を含む、月商5,000万円規模＝見込み）の最終確認
- [ ] 店舗写真・ブランド名の掲載確認（今は Bolero／弥之助／清田焼肉店／恒之助／Bardebis の5店舗。屋根裏のパリ食堂は非公開扱いのため掲載していない）
- [ ] 法務・広告表現の確認（「1円もいただきません」と注記の書き方、景品表示法・融資の媒介に関する表現）
- [ ] プライバシーポリシー：今は basic-fnb.com/privacy にリンク。財務情報など相談で預かる情報の取り扱いが含まれているか確認
- [ ] 秘密保持・個人情報の管理体制
- [ ] 相談対応の体制と返信目安（完了画面・自動返信メールには今は返信目安を書いていない）
- [ ] フォームの通知先・運用責任者、Apps Script のデプロイ
