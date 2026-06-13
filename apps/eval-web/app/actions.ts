"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePrincipal } from "@/server/auth/session";
import * as datasets from "@/server/datasets/service";
import * as prompts from "@/server/prompts/service";
import * as judges from "@/server/judges/service";
import { createRun } from "@/server/runs/service";
import { executeRun } from "@/server/runs/executor";
import type { FieldRule, JsonSchemaObject, LabelJson } from "@/server/db/jsonTypes";

export async function createDatasetAction(formData: FormData) {
    const p = await requirePrincipal();
    const name = String(formData.get("name") || "Untitled dataset");
    const ds = await datasets.createDataset(p.teamId, name, p.userId);
    revalidatePath("/datasets");
    redirect(`/datasets/${ds.id}`);
}

export async function setSchemaAction(formData: FormData) {
    await requirePrincipal();
    const datasetId = String(formData.get("datasetId"));
    const jsonSchema = JSON.parse(
        String(formData.get("jsonSchema") || "{}"),
    ) as JsonSchemaObject;
    const fieldRules = JSON.parse(
        String(formData.get("fieldRules") || "[]"),
    ) as FieldRule[];
    await datasets.setDatasetSchema(datasetId, jsonSchema, fieldRules);
    revalidatePath(`/datasets/${datasetId}`);
}

export async function addItemAction(formData: FormData) {
    await requirePrincipal();
    const datasetId = String(formData.get("datasetId"));
    const inputText = String(formData.get("inputText") || "");
    const labelRaw = String(formData.get("label") || "").trim();
    const label = labelRaw ? (JSON.parse(labelRaw) as LabelJson) : undefined;

    const image = formData.get("image");
    if (image && typeof image !== "string" && image.size > 0) {
        const buf = Buffer.from(await image.arrayBuffer());
        await datasets.addImageItem(
            datasetId,
            buf,
            image.type,
            inputText || undefined,
            label,
        );
    } else {
        await datasets.addTextItem(datasetId, inputText, label);
    }
    revalidatePath(`/datasets/${datasetId}`);
}

export async function createPromptAction(formData: FormData) {
    const p = await requirePrincipal();
    const name = String(formData.get("name") || "prompt");
    const scope = String(formData.get("scope")) === "model" ? "model" : "shared";
    const content = String(formData.get("content") || "");
    const prompt = await prompts.createPrompt(p.teamId, name, scope);
    if (content) await prompts.addPromptVersion(prompt.id, content, p.userId);
    revalidatePath("/prompts");
    redirect("/prompts");
}

export async function addPromptVersionAction(formData: FormData) {
    const p = await requirePrincipal();
    const promptId = String(formData.get("promptId"));
    const content = String(formData.get("content") || "");
    await prompts.addPromptVersion(promptId, content, p.userId);
    revalidatePath("/prompts");
}

export async function createJudgeAction(formData: FormData) {
    const p = await requirePrincipal();
    await judges.createJudgeConfig(
        p.teamId,
        String(formData.get("name") || "judge"),
        String(formData.get("modelId") || "gpt-4o-mini"),
        String(formData.get("rubricPrompt") || ""),
    );
    revalidatePath("/runs/new");
}

export async function createRunAction(formData: FormData) {
    const p = await requirePrincipal();
    const datasetId = String(formData.get("datasetId"));
    const promptVersionId = String(formData.get("promptVersionId"));
    const maxTokens = Number(formData.get("maxTokens") || 500);
    const judgeConfigId =
        String(formData.get("judgeConfigId") || "") || undefined;
    const referenceModel = String(formData.get("referenceModel") || "").trim();
    const modelIds = String(formData.get("models") || "")
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

    const models = modelIds.map((modelId) => ({
        modelId,
        promptVersionId,
        isReference: modelId === referenceModel,
    }));

    const runId = await createRun(
        p.teamId,
        datasetId,
        models,
        maxTokens,
        judgeConfigId,
        p.userId,
    );
    await executeRun(runId);
    redirect(`/runs/${runId}`);
}

export async function retryRunAction(formData: FormData) {
    await requirePrincipal();
    const runId = String(formData.get("runId"));
    await executeRun(runId);
    revalidatePath(`/runs/${runId}`);
}
