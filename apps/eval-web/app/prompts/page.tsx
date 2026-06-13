import { requirePrincipal } from "@/server/auth/session";
import { listPrompts, listVersions } from "@/server/prompts/service";
import { createPromptAction, addPromptVersionAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
    const p = await requirePrincipal();
    const prompts = await listPrompts(p.teamId);
    const versionsByPrompt = await Promise.all(
        prompts.map((pr) => listVersions(pr.id)),
    );

    return (
        <div>
            <h1>Prompts</h1>
            <form action={createPromptAction} className="card">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" type="text" placeholder="extract" />
                <label htmlFor="scope">Scope</label>
                <select id="scope" name="scope">
                    <option value="shared">shared</option>
                    <option value="model">model</option>
                </select>
                <label htmlFor="content">Initial version content</label>
                <textarea id="content" name="content" rows={4} />
                <button type="submit">Create prompt</button>
            </form>

            {prompts.map((pr, i) => (
                <div key={pr.id} className="card">
                    <strong>{pr.name}</strong>{" "}
                    <span className="muted">({pr.scope})</span>
                    {versionsByPrompt[i].map((v) => (
                        <div key={v.id} className="muted" style={{ marginTop: 6 }}>
                            v{v.version} · <code>{v.id}</code>
                            <pre>{v.content}</pre>
                        </div>
                    ))}
                    <form action={addPromptVersionAction}>
                        <input type="hidden" name="promptId" value={pr.id} />
                        <label htmlFor={`c-${pr.id}`}>New version</label>
                        <textarea id={`c-${pr.id}`} name="content" rows={3} />
                        <button type="submit">Add version</button>
                    </form>
                </div>
            ))}
        </div>
    );
}
