require('dotenv').config();
const express = require('express');
const OpenAI  = require('openai');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static('public'));

// iframe埋め込みを許可（X-Frame-Options: SAMEORIGIN をRenderが付けるため除去）
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  next();
});

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/diagnose', async (req, res) => {
  const { goal, situation, priority, freetext } = req.body;

  const freetextLine = freetext && freetext.trim()
    ? `- 【最重要】お客様の生の声（必ずこの内容を診断結果に反映してください）: ${freetext}`
    : '';

  const freetextInstruction = freetext && freetext.trim()
    ? `特に「お客様の生の声」に書かれた具体的な内容・状況・言葉を最優先で参照し、reason や first_step に必ず反映してください。`
    : '';

  const prompt = `あなたは仙台のクリエイター「Hi Dawn」の相談アドバイザーです。
Hi Dawnのサービスは以下の4つです：

1. Web制作（LP・コーポレートサイト・ポートフォリオ）¥50,000〜
2. ロゴデザイン（ヒアリングから3案のご提案、データ納品まで）¥30,000〜
3. DTP（名刺・フライヤー・ショップカードなど）¥5,000〜
4. AI・ツール開発（作業自動化・専用ツール・AI活用の導入）お見積り

お客様の回答：
- 叶えたいこと: ${goal}
- 現在の状況: ${situation}
- 重視すること: ${priority}
${freetextLine}

この方に最もぴったりのサービスを1〜2個選んでください。
サービスを2個選ぶ場合は、一緒に進めると効果的な組み合わせのときだけにしてください。
${freetextInstruction}

以下のJSON形式のみで返してください（JSON以外のテキストは含めないこと）：

{
  "message": "全体への一言コメント（50字以内、この方の状況に寄り添った温かい言葉）",
  "recommendations": [
    {
      "service": "サービス名（例: Web制作）",
      "price": "¥50,000〜 など（AI・ツール開発の場合はお見積り）",
      "reason": "なぜこのサービスがぴったりかを、この方の状況を踏まえて具体的に説明（120〜160字）",
      "includes": ["このサービスに含まれること1（15字以内）", "含まれること2（15字以内）", "含まれること3（15字以内）"],
      "first_step": "今すぐできる最初の一歩（例：まずはヒアリングで方向性を固めましょう）（40字以内）",
      "tags": ["キーワード1", "キーワード2", "キーワード3"]
    }
  ]
}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const data = JSON.parse(completion.choices[0].message.content.trim());
    res.json(data);
  } catch (err) {
    console.error('diagnose error:', err.message);
    res.status(500).json({ error: '診断の生成に失敗しました。しばらく待ってからお試しください。' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✨  Hi Dawn プラン診断ツール が起動しました`);
  console.log(`   http://localhost:${PORT}\n`);
});
