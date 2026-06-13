// One provider class covering every OpenAI-Chat-Completions-compatible endpoint:
// OpenAI, Google (OpenAI-compat base), OpenRouter, Grok, Perplexity. Each differs
// only by baseURL (and OpenRouter's attribution headers), exactly as the desktop
// app's OpenAI-compatible providers do.

import OpenAI from "openai";
import type {
    CompletionRequest,
    CompletionResult,
    IEvalCompletionProvider,
    UsageData,
} from "../types";
import { parseStructuredOutput } from "./structuredOutput";

export interface OpenAICompatibleConfig {
    apiKey: string;
    baseURL?: string;
    /** When true (OpenRouter), capture `response.id` as the generation id for cost lookup. */
    capturesGenerationId?: boolean;
    /** Extra headers (OpenRouter attribution). */
    defaultHeaders?: Record<string, string>;
}

export class OpenAICompatibleProvider implements IEvalCompletionProvider {
    private client: OpenAI;

    constructor(private config: OpenAICompatibleConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
            defaultHeaders: config.defaultHeaders,
        });
    }

    async complete(req: CompletionRequest): Promise<CompletionResult> {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
            [];
        if (req.system) messages.push({ role: "system", content: req.system });

        // Text before images, per OpenRouter guidance mirrored in the desktop app.
        const userParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
            { type: "text", text: req.prompt },
        ];
        for (const img of req.images ?? []) {
            userParts.push({
                type: "image_url",
                image_url: {
                    url: `data:${img.mimeType};base64,${img.base64Data}`,
                },
            });
        }
        messages.push({ role: "user", content: userParts });

        const responseFormat = req.responseSchema
            ? ({
                  type: "json_schema",
                  json_schema: {
                      name: req.responseSchema.name,
                      schema: req.responseSchema.schema,
                      strict: true,
                  },
              } satisfies OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"])
            : undefined;

        const start = performance.now();
        const response = await this.client.chat.completions.create({
            model: req.model,
            messages,
            max_tokens: req.maxTokens,
            temperature: req.temperature,
            response_format: responseFormat,
            stream: false,
        });
        const latencyMs = performance.now() - start;

        const text = response.choices[0]?.message?.content ?? "";

        const usage: UsageData = {
            promptTokens: response.usage?.prompt_tokens,
            completionTokens: response.usage?.completion_tokens,
            totalTokens: response.usage?.total_tokens,
            generationId: this.config.capturesGenerationId
                ? response.id
                : undefined,
        };

        const { parsed, schemaViolation } = parseStructuredOutput(
            text,
            req.responseSchema,
        );

        return { text, parsed, schemaViolation, usage, latencyMs };
    }
}
