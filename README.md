# AtCoder Auto Pager
AtCoderの順位表のヘッダーに検索窓を追加するユーザースクリプト [AtCoder Auto Pager](https://greasyfork.org/ja/scripts/421991) の開発環境です．

## デモ
https://user-images.githubusercontent.com/77602539/211727871-84ffaff9-c24b-4fa6-8c05-86c2aab0bfda.mp4

## 開発
### 環境構築
```
npm ci
```

### 開発
```
npm start
```

### テスト
ローカルのスクリプトをAtCoder上で実行するには，ブラウザに以下のスクリプトを登録します．
```
// ==UserScript==
// @name         AtCoder Auto Pager (Dev)
// @require      file:///.../dist/bundle.js
// @match        https://atcoder.jp/contests/*/standings
// @match        https://atcoder.jp/contests/*/standings?*
// @match        https://atcoder.jp/contests/*/standings/
// @match        https://atcoder.jp/contests/*/standings/?*
// @match        https://atcoder.jp/contests/*/standings/virtual
// @match        https://atcoder.jp/contests/*/standings/virtual?*
// @match        https://atcoder.jp/contests/*/standings/virtual/
// @match        https://atcoder.jp/contests/*/standings/virtual/?*
// @match        https://atcoder.jp/contests/*/results
// @match        https://atcoder.jp/contests/*/results?*
// @match        https://atcoder.jp/contests/*/results/
// @match        https://atcoder.jp/contests/*/results/?*
// @exclude      https://atcoder.jp/*/json
// ==/UserScript==
```
