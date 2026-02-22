# Vercel と NextAuth のセットアップ手順

このドキュメントは、プロジェクトを Vercel にデプロイし、NextAuth (Google ログイン) を設定するための手順書です。

## 1. Google OAuth クライアントの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスします。
2. 新しいプロジェクトを作成、または既存のプロジェクトを選択します。
3. 左側のメニューから 「API とサービス」 > 「認証情報」 に移動します。
4. 「認証情報を作成」 > 「OAuth クライアント ID」 を選択します。
5. 「同意画面を設定」と表示された場合は、ユーザーの種類を「外部」または「内部」を選択し、必須項目（アプリ名、ユーザーサポートメール、デベロッパーの連絡先情報）を入力して保存します。
6. アプリケーションの種類で「ウェブ アプリケーション」を選択します。
7. 名前を任意に設定します（例: ChatJapan）。
8. **承認済みの JavaScript オリジン**:
   - 開発環境: `http://localhost:3000`
   - 本番環境: デプロイ後の Vercel のドメイン（例: `https://chatjapan.vercel.app`）
9. **承認済みのリダイレクト URI**:
   - 開発環境: `http://localhost:3000/api/auth/callback/google`
   - 本番環境: デプロイ後の Vercel のドメインに合わせて設定（例: `https://chatjapan.vercel.app/api/auth/callback/google`）
10. 「作成」をクリックすると、`クライアント ID` (GOOGLE_CLIENT_ID) と `クライアント シークレット` (GOOGLE_CLIENT_SECRET) が発行されます。これをコピーしておきます。

## 2. `.env.local` の設定 (ローカル開発用)

プロジェクトのルートディレクトリに `.env.local` 変更・追加します。（このファイルはGitにはプッシュされません）

```env
# NextAuth
AUTH_SECRET="ランダムな32文字以上の文字列" # 生成方法:ターミナルで `openssl rand -base64 32` を実行
GOOGLE_CLIENT_ID="取得した Google クライアント ID"
GOOGLE_CLIENT_SECRET="取得した Google クライアント シークレット"

# 既存の設定 (参考)
ESTAT_API_KEY="e-StatのAPIキー"
OPENAI_API_KEY="OpenAIのAPIキー"
LLM_PROVIDER="openai"
LLM_MODEL="gpt-4o"
```

## 3. Vercel へのデプロイと環境変数設定

1. [Vercel](https://vercel.com/) にログインし、「Add New...」>「Project」から GitHub リポジトリ (`ChatJapan`) をインポートします。
2. 「Environment Variables」のセクションを開きます。
3. `.env.local` に設定した以下の環境変数を全てコピーして設定します:
   - `AUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `ESTAT_API_KEY`
   - `OPENAI_API_KEY` (または `ANTHROPIC_API_KEY`)
   - `LLM_PROVIDER`
   - `LLM_MODEL`
4. ※ `NEXTAUTH_URL` について: NextAuth v5 以降（また Vercel にデプロイ時）は自動で認識されるため明記は不要ですが、問題がある場合は `NEXTAUTH_URL=https://<あなたのVercelのドメイン>` を追加してください。
5. 「Deploy」をクリックしてデプロイを完了します。

以上の手順により、本番環境へのデプロイと Google アカウントでの認証が正しく機能するようになります。
