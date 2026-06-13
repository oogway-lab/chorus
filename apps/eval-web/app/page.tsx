import Link from "next/link";

export default function HomePage() {
    return (
        <div>
            <h1>Model Eval</h1>
            <p>
                Run an image or text dataset through several OpenAI models and
                compare structured output, latency, cost, field-level accuracy
                against labels, and an LLM-judge score — to pick a cheaper model
                that holds quality.
            </p>
            <div className="card">
                <strong>Workflow</strong>
                <ol>
                    <li>
                        <Link href="/datasets">Create a dataset</Link>, define
                        its output schema + per-field match rules, add items and
                        labels.
                    </li>
                    <li>
                        <Link href="/prompts">Author a prompt</Link> (versioned).
                    </li>
                    <li>
                        <Link href="/runs/new">Start a run</Link> across candidate
                        models, then read the matrix and leaderboard.
                    </li>
                </ol>
            </div>
        </div>
    );
}
