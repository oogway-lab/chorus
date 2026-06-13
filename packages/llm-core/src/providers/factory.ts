// Resolves the OpenAI eval provider from the team's API key.

import type { ApiKeys, IEvalCompletionProvider } from "../types";
import { OpenAIEvalProvider } from "./openai";

export function getEvalProvider(apiKeys: ApiKeys): IEvalCompletionProvider {
    if (!apiKeys.openai) {
        throw new Error("Please add your OpenAI API key to run evals.");
    }
    return new OpenAIEvalProvider(apiKeys.openai);
}
