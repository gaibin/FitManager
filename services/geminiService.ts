import { Member, Language } from '../types';

/**
 * 切换到 Kimi（Moonshot）OpenAI 兼容接口。
 * 需要在 `.env.local` 配置：
 *   VITE_KIMI_API_KEY=你的 Kimi 密钥（sk- 开头）
 * 可选：
 *   VITE_KIMI_BASE_URL=https://api.moonshot.cn/v1/chat/completions
 *   VITE_KIMI_MODEL=moonshot-v1-8k
 *
 * 注意：前端直接带 Key 会暴露给浏览器，若要上线公网，建议改成后端/Serverless 代理持有 Key。
 */

export const getTrainingAdvice = async (
  member: Member,
  userQuery: string,
  language: Language
): Promise<string> => {
  const apiKey = import.meta.env.VITE_KIMI_API_KEY || '';
  const baseUrl =
    import.meta.env.VITE_KIMI_BASE_URL ||
    'https://api.moonshot.cn/v1/chat/completions';
  const model = import.meta.env.VITE_KIMI_MODEL || 'moonshot-v1-8k';

  if (!apiKey) {
    return language === 'zh'
      ? '未配置 Kimi API Key：请在 `.env.local` 设置 VITE_KIMI_API_KEY（然后重启 dev server）。'
      : 'Kimi API key missing: set VITE_KIMI_API_KEY in `.env.local` (then restart dev server).';
  }

  // Construct context from member history
  const historyContext = member.workouts
    .slice(-10) // Last 10 workouts to save tokens
    .map(w => `- ${w.date}: ${w.exercise} ${w.sets}x${w.reps} @ ${w.weight}kg`)
    .join('\n');

  const langInstruction = language === 'zh' 
    ? "Please respond in Chinese (Simplified)." 
    : "Please respond in English.";

  const prompt = `
    You are an elite fitness coach for a private studio.
    
    Member Profile:
    Name: ${member.name}
    Recent Training History:
    ${historyContext}

    User Question (Coach's query):
    "${userQuery || "Analyze recent performance and suggest the next progression."}"

    ${langInstruction}
    Keep the advice concise, professional, and motivating. Focus on progressive overload.
  `;

  try {
    const resp = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an elite fitness coach for a private studio.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Kimi API error: ${resp.status} ${errText}`);
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    return content || 'No advice generated.';
  } catch (error) {
    console.error('Kimi API Error:', error);
    return language === 'zh'
      ? '调用 Kimi AI 出错，请检查 Key / 网络 / 余额。'
      : 'Kimi AI request failed. Check key/network/quota.';
  }
};