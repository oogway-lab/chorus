"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FOOD_SCHEMA,
    FOOD_RULES,
    SIMPLE_SCHEMA,
    SIMPLE_RULES,
} from "@/lib/schema-presets";

export function SchemaEditor({
    datasetId,
    initialSchema,
    initialRules,
    action,
}: {
    datasetId: string;
    initialSchema: string;
    initialRules: string;
    action: (formData: FormData) => Promise<void>;
}) {
    const [jsonSchema, setJsonSchema] = useState(initialSchema);
    const [fieldRules, setFieldRules] = useState(initialRules);

    function applyPreset(schema: string, rules: string) {
        setJsonSchema(schema);
        setFieldRules(rules);
    }

    return (
        <form action={action} className="space-y-4">
            <input type="hidden" name="datasetId" value={datasetId} />
            <input type="hidden" name="jsonSchema" value={jsonSchema} />
            <input type="hidden" name="fieldRules" value={fieldRules} />

            <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted">Presets:</span>
                <button type="button" onClick={() => applyPreset(FOOD_SCHEMA, FOOD_RULES)}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100">
                        Food plate
                    </Badge>
                </button>
                <button
                    type="button"
                    onClick={() => applyPreset(SIMPLE_SCHEMA, SIMPLE_RULES)}
                >
                    <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100">
                        Text Q&A
                    </Badge>
                </button>
            </div>

            <Tabs defaultValue="schema">
                <TabsList>
                    <TabsTrigger value="schema">JSON schema</TabsTrigger>
                    <TabsTrigger value="rules">Field rules</TabsTrigger>
                </TabsList>
                <TabsContent value="schema">
                    <Label htmlFor="schema-edit">Output schema</Label>
                    <Textarea
                        id="schema-edit"
                        value={jsonSchema}
                        onChange={(e) => setJsonSchema(e.target.value)}
                        rows={12}
                        className="mt-2"
                    />
                </TabsContent>
                <TabsContent value="rules">
                    <Label htmlFor="rules-edit">
                        Field rules (exact / numeric_tolerance / set_overlap)
                    </Label>
                    <Textarea
                        id="rules-edit"
                        value={fieldRules}
                        onChange={(e) => setFieldRules(e.target.value)}
                        rows={10}
                        className="mt-2"
                    />
                </TabsContent>
            </Tabs>

            <Button type="submit">Save schema</Button>
        </form>
    );
}