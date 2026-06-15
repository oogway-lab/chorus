import { requirePrincipal } from "@/server/auth/session";
import { listPrompts, listVersions } from "@/server/prompts/service";
import { createPromptAction, addPromptVersionAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { PromptCard } from "@/components/prompts/prompt-card";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STARTER_PROMPT = `Analyze the image and extract structured information about the food on the plate. Return JSON matching the dataset schema. Be precise about dish name, calorie estimate, and individual food items visible.`;

export default async function PromptsPage() {
    const p = await requirePrincipal();
    const prompts = await listPrompts(p.teamId);
    const versionsByPrompt = await Promise.all(
        prompts.map((pr) => listVersions(pr.id)),
    );

    return (
        <div>
            <PageHeader
                title="Prompts"
                description="Versioned prompts for model evaluation. Every result links to a specific prompt version."
            />

            <Card className="mb-8">
                <CardContent className="space-y-4 pt-5">
                    <form action={createPromptAction} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="extract"
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="scope">Scope</Label>
                                <Select id="scope" name="scope" className="mt-1.5">
                                    <option value="shared">shared</option>
                                    <option value="model">model</option>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="content">Initial version content</Label>
                            <Textarea
                                id="content"
                                name="content"
                                rows={4}
                                defaultValue={STARTER_PROMPT}
                                className="mt-1.5 font-sans"
                            />
                        </div>
                        <Button type="submit">Create prompt</Button>
                    </form>
                </CardContent>
            </Card>

            {prompts.length === 0 ? (
                <EmptyState
                    title="No prompts yet"
                    description="Create a versioned prompt to use in evaluation runs. Start from the food extraction template above."
                    actionLabel="Create prompt"
                    actionHref="/prompts"
                />
            ) : (
                <div className="space-y-4">
                    {prompts.map((pr, i) => (
                        <PromptCard
                            key={pr.id}
                            name={pr.name}
                            scope={pr.scope}
                            promptId={pr.id}
                            versions={versionsByPrompt[i]}
                            addVersionAction={addPromptVersionAction}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}