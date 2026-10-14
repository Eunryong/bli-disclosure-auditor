import { NextResponse } from "next/server";
import {
  callGeminiLlm,
  getGeminiConfig,
  saveGeminiConfigToEnv,
} from "@/lib/llm";

export async function GET() {
  try {
    const config = getGeminiConfig();
    return NextResponse.json({
      configured: config.hasApiKey,
      hasApiKey: config.hasApiKey,
      maskedKey: config.maskedKey,
      model: config.model,
      fallbackModel: config.fallbackModel,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to read Gemini configuration." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      apiKey,
      model,
      testOnly = false,
      testConnection = true,
    }: {
      apiKey?: string;
      model?: string;
      testOnly?: boolean;
      testConnection?: boolean;
    } = body;

    let config = getGeminiConfig();

    if (!testOnly && (typeof apiKey === "string" || typeof model === "string")) {
      config = saveGeminiConfigToEnv({
        apiKey: typeof apiKey === "string" ? apiKey : undefined,
        model: typeof model === "string" ? model : undefined,
      });
    }

    const effectiveKey =
      typeof apiKey === "string" && apiKey.trim().length > 0
        ? apiKey.trim()
        : config.apiKey;
    const effectiveModel =
      typeof model === "string" && model.trim().length > 0
        ? model.trim()
        : config.model;

    let testResult: {
      ok: boolean;
      telemetry?: any;
      response?: any;
      error?: string;
    } | null = null;

    if (testConnection && effectiveKey) {
      const llmRes = await callGeminiLlm<{ status: string; engine: string }>({
        systemInstruction:
          "You are the Google Gemini AI engine for the BLI Disclosure vs. Smart Contract Mismatch Auditor.",
        userPrompt:
          'Reply with valid JSON: {"status": "ONLINE", "engine": "Google Gemini AI Legal-Forensic Auditor"}',
        task: "connection_test",
        apiKeyOverride: effectiveKey,
        modelOverride: effectiveModel,
        temperature: 0,
      });

      testResult = {
        ok: llmRes.ok,
        telemetry: llmRes.telemetry,
        response: llmRes.parsedJson,
        error: llmRes.error,
      };
    }

    return NextResponse.json({
      hasApiKey: config.hasApiKey,
      maskedKey: config.maskedKey,
      model: config.model,
      fallbackModel: config.fallbackModel,
      testResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to save or test Gemini API configuration." },
      { status: 500 }
    );
  }
}
