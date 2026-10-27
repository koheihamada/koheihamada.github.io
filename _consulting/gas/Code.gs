/**
 * 伴走コンサル LP 問い合わせ受付（Google Apps Script）
 *
 * セットアップ（README.md 参照）
 *  1. Google スプレッドシートを新規作成 →「拡張機能 > Apps Script」にこのファイルを貼り付け
 *  2. 「プロジェクトの設定 > スクリプト プロパティ」に以下を登録
 *       NOTIFY_TO    : 通知先メールアドレス（カンマ区切りで複数可）
 *       SERVICE_NAME : 伴走コンサル（正式名称が決まったら変更）
 *       REPLY_FROM_NAME : 自動返信の差出人名（例：伴走コンサル 事務局）
 *  3. 「デプロイ > 新しいデプロイ > ウェブアプリ」
 *       実行ユーザー：自分 / アクセスできるユーザー：全員
 *  4. 発行された URL を _consulting/config.json の endpoint に設定してビルド
 */

var SHEET_NAME = '問い合わせ';
var HEADERS = ['受付日時', '氏名', '会社名・店舗名', 'メール', '電話', '運営店舗数', '相談内容', '詳細',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid',
  'ランディングURL', 'リファラ', '送信ページ', 'ステータス'];

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // --- スパム対策 ---
    if (d.website) return json_({ ok: true });                     // honeypot：bot には成功を装う
    if (Number(d.elapsed_ms || 0) < 3000) return json_({ ok: false, error: 'too_fast' });

    // --- 入力検証（サーバー側でも必ず行う） ---
    var s = function (v, max) { return String(v || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max); };
    var data = {
      name: s(d.name, 60), company: s(d.company, 100), email: s(d.email, 120), tel: s(d.tel, 20),
      stores: s(d.stores, 20), topics: s(d.topics, 200), message: String(d.message || '').trim().slice(0, 2000)
    };
    if (!data.name || !data.company || !data.email || !data.stores || !data.topics) return json_({ ok: false, error: 'required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return json_({ ok: false, error: 'email' });

    // --- 連投防止（同じメールは10分に1回） ---
    var cache = CacheService.getScriptCache();
    var key = 'sent_' + Utilities.base64EncodeWebSafe(data.email.toLowerCase());
    if (cache.get(key)) return json_({ ok: false, error: 'rate_limited' });

    // --- 記録 ---
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
    var safe = function (v) { v = String(v || ''); return /^[=+\-@]/.test(v) ? "'" + v : v; }; // 数式インジェクション対策
    sh.appendRow([new Date(), data.name, data.company, data.email, data.tel, data.stores, data.topics, data.message,
      d.utm_source, d.utm_medium, d.utm_campaign, d.utm_term, d.utm_content, d.gclid,
      d.landing_page, d.referrer, d.page_url, '未対応'].map(safe));
    lock.releaseLock();
    cache.put(key, '1', 600);

    // --- メール ---
    var props = PropertiesService.getScriptProperties();
    var service = props.getProperty('SERVICE_NAME') || '伴走コンサル';
    var fromName = props.getProperty('REPLY_FROM_NAME') || service;
    var notifyTo = props.getProperty('NOTIFY_TO');
    var body = [
      '氏名：' + data.name, '会社名・店舗名：' + data.company, 'メール：' + data.email, '電話：' + (data.tel || '—'),
      '運営店舗数：' + data.stores, '相談内容：' + data.topics, '', '詳細：', data.message || '—', '',
      '流入：' + [d.utm_source, d.utm_medium, d.utm_campaign].filter(String).join(' / '), 'スプレッドシート：' + ss.getUrl()
    ].join('\n');
    if (notifyTo) MailApp.sendEmail({ to: notifyTo, subject: '【' + service + '】無料相談の申し込み：' + data.company, body: body, replyTo: data.email, name: service + ' LP' });

    MailApp.sendEmail({
      to: data.email, name: fromName,
      subject: '【' + service + '】無料相談のお申し込みを受け付けました',
      body: data.name + ' 様\n\n' + service + 'へのお申し込みありがとうございます。\n以下の内容で受け付けました。ご相談内容を確認のうえ、担当者よりご連絡いたします。\n\n' +
        '――――――――――\n会社名・店舗名：' + data.company + '\n運営店舗数：' + data.stores + '\n相談内容：' + data.topics + '\n詳細：' + (data.message || '—') + '\n――――――――――\n\n' +
        '※ このメールは送信専用です。お心当たりのない場合は、お手数ですが破棄してください。\n\n' + service + '（運営：株式会社Basic）'
    });

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
