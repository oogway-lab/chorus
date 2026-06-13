// Native Anthropic provider. Structured output is achieved with a single forced
// tool whose input schema is the response schema — the model is required to call
// it, and the tool input IS the structured object. This mirrors the desktop app's
// tool plumbing and is more reliable than asking for JSON in prose.

import Anthropic from "@anthropic-ai/sdk";
import type {
    CompletionRequest,
    CompletionResult,
    IEvalCompletionProvider,
    UsageData,
} from "../types";

const STRUCTURED_TOOL_FALLBACK_NAME = "respond";

// Anthropic's base64 image source accepts these media types. Declared locally
// because the SDK (0.33.1) does not export a reusable alias for the union.
type AnthropicMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export class AnthropicEvalProvider implements IEvalCompletionProvider {
    private client: Anthropic;

    constructor(apiKey: string) {
        this.client = new Anthropic({ apiKey });
    }

    async complete(req: CompletionRequest): Promise<CompletionResult> {
        const content: Anthropic.ContentBlockParam[] = [
            { type: "text", text: req.prompt },
        ];
        for (const img of req.images ?? []) {
            content.push({
                type: "image",
                source: {
                    type: "base64",
                    // Caller supplies a supported image mime type; narrowed here.
                    media_type: img.mimeType as AnthropicMediaType,
                    data: img.base64Data,
                },
            });
        }

        const useTool = req.responseSchema !== undefined;
        const toolName = req.responseSchema?.name ?? STRUCTURED_TOOL_FALLBACK_NAME;

        const start = performance.now();
        const response = await this.client.messages.create({
            model: req.model,
            max_tokens: req.maxTokens,
            temperature: req.temperature,
            system: req.system,
            messages: [{ role: "user", content }],
            tools: useTool
                ? [
                      {
                          name: toolName,
                          description:
                              "Return the structured result conforming to the schema.",
                          input_schema: req.responseSchema!
                              .schema as Anthropic.Tool.InputSchema,
                      },
                  ]
                : undefined,
            tool_choice: useTool ? { type: "tool", name: toolName } : undefined,
        });
        const latencyMs = performance.now() - start;

        const usage: UsageData = {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens:
                response.usage.input_tokens + response.usage.output_tokens,
        };

        if (useTool) {
            const toolBlock = response.content.find(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
            );
            if (!toolBlock) {
                return {
                    text: this.collectText(response.content),
                    schemaViolation: true,
                    usage,
                    latencyMs,
                };
            }
            return {
                text: JSON.stringify(toolBlock.input),
                parsed: toolBlock.input,
                usage,
                latencyMs,
            };
        }

        return { text: this.collectText(response.content), usage, latencyMs };
    }

    private collectText(blocks: Anthropic.ContentBlock[]): string {
        return blocks
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("");
    }
}
