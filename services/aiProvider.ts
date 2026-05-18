/**
 * AI Provider 抽象层 — 统一接口支持 Gemini / DeepSeek / Kimi / OpenAI 兼容
 */

import type { AIProviderConfig } from '../types';

export interface AIProvider {
  generateText(prompt: string, context?: string): Promise<string>;
}

class GeminiProvider implements AIProvider {
  private apiKey: string;
  private modelName: string;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.modelName = config.modelName || 'gemini-2.0-flash';
  }

  async generateText(prompt: string, context?: string): Promise<string> {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const model = ai.models;
    const fullPrompt = context ? `Context:\n${context}\n\nPrompt:\n${prompt}` : prompt;

    const result = await model.generateContent({
      model: this.modelName,
      contents: fullPrompt,
    });

    return result.text || '';
  }
}

class OpenAICompatibleProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;
  private modelName: string;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.modelName = config.modelName || 'gpt-3.5-turbo';
  }

  async generateText(prompt: string, context?: string): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const fullPrompt = context ? `Context:\n${context}\n\nPrompt:\n${prompt}` : prompt;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are a professional fitness coach for a private gym studio.' },
          { role: 'user', content: fullPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`AI API error: ${resp.status} ${errText}`);
    }

    const data = await resp.json();
    return data?.choices?.[0]?.message?.content || '无法生成建议';
  }
}

export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case 'gemini':
      return new GeminiProvider(config);
    case 'deepseek':
    case 'kimi':
    case 'openai-compatible':
      return new OpenAICompatibleProvider(config);
    default:
      return new OpenAICompatibleProvider(config);
  }
}

// 预置模型配置
export const PROVIDER_PRESETS: Record<string, { baseUrl: string; defaultModel: string }> = {
  gemini: {
    baseUrl: '',
    defaultModel: 'gemini-2.0-flash',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
  },
  kimi: {
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
  },
  'openai-compatible': {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-3.5-turbo',
  },
};

// 测试 AI 连接
export async function testAIProvider(config: AIProviderConfig): Promise<{ success: boolean; message: string }> {
  try {
    const provider = createAIProvider(config);
    const result = await provider.generateText('Reply with only the word "OK".');
    return { success: true, message: result.trim() === 'OK' ? '连接成功' : `返回内容: ${result.slice(0, 100)}` };
  } catch (error: any) {
    return { success: false, message: error.message || '连接失败' };
  }
}
