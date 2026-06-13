// The single OpenAI completion provider: chat completions with latency capture,
// base64 images, and JSON-schema structured output.

import OpenAI from "openai";
import type {
    CompletionRequest,
    CompletionResult,
    IEvalCompletionProvider,
    UsageData,
} from "../types";
import { parseStructuredOutput } from "./structuredOutput";

/**
 * Reasoning models (o-series, gpt-5 family) reject `max_tokens` and a
 * non-default `temperature`. Detect them so the request uses the right params.
 */
function isReasoningModel(model: string): boolean {
    return /^o\d/.test(model) || /^gpt-5/.test(model);
}

export class OpenAIEvalProvider implements IEvalCompletionProvider {
    private client: OpenAI;

    constructor(apiKey: string) {
        this.client = new OpenAI({ apiKey });
    }

    async complete(req: CompletionRequest): Promise<CompletionResult> {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
            [];
        if (req.system) messages.push({ role: "system", content: req.system });

        // Text before images.
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

        // `max_completion_tokens` is the current param and works for both gpt-4o
        // and reasoning models; `max_tokens` is deprecated and rejected by o-series.
        const reasoning = isReasoningModel(req.model);
        const start = performance.now();
        const response = await this.client.chat.completions.create({
            model: req.model,
            messages,
            max_completion_tokens: req.maxTokens,
            temperature: reasoning ? undefined : req.temperature,
            response_format: responseFormat,
            stream: false,
        });
        const latencyMs = performance.now() - start;

        const text = response.choices[0]?.message?.content ?? "";

        const usage: UsageData = {
            promptTokens: response.usage?.prompt_tokens,
            completionTokens: response.usage?.completion_tokens,
            totalTokens: response.usage?.total_tokens,
        };

        const { parsed, schemaViolation } = parseStructuredOutput(
            text,
            req.responseSchema,
        );

        return { text, parsed, schemaViolation, usage, latencyMs };
    }
}
