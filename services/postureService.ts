/**
 * 体态评估 Flask 后端 API 服务封装
 */

const API_URL = import.meta.env.VITE_POSTURE_API_URL || 'http://localhost:5000';

export interface AnalyzeRequest {
  front_image: string;
  side_image: string;
  back_image?: string;
  height_cm: number;
  gender: string;
  pose_engine?: string;
  strict_mode?: boolean;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: {
    score: number;
    confidence: number;
    issues: Array<{
      name: string;
      value: number;
      unit: string;
      severity: string;
      description: string;
      exercises?: string[];
      threshold_warn?: number;
      threshold_err?: number;
      confidence?: number;
    }>;
    correction_plan?: {
      week1_2: Array<{
        name: string;
        description: string;
        sets: string;
      }>;
      week3_4: Array<{
        name: string;
        description: string;
        sets: string;
      }>;
    };
    photo_quality?: Record<string, any>;
  };
  error?: string;
  photo_quality?: Record<string, any>;
}

async function requestWithTimeout<T>(url: string, options: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查后端是否正常运行');
    }
    throw error;
  }
}

export async function analyzePosture(data: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await requestWithTimeout<AnalyzeResponse>(
    `${API_URL}/api/analyze`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    45000 // 体态分析可能需要较长时间
  );
  return res;
}

export async function checkHealth(): Promise<{ status: string; version: string }> {
  const res = await requestWithTimeout<{ status: string; version: string }>(
    `${API_URL}/api/health`,
    { method: 'GET' },
    10000
  );
  return res;
}
