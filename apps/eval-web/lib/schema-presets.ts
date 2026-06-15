// Shared output-schema / field-rule presets, used by the dataset page default
// template and the schema editor's preset buttons.

export const FOOD_SCHEMA = JSON.stringify(
    {
        type: "object",
        additionalProperties: false,
        required: ["dish", "calories", "items"],
        properties: {
            dish: { type: "string" },
            calories: { type: "number" },
            items: { type: "array", items: { type: "string" } },
        },
    },
    null,
    2,
);

export const FOOD_RULES = JSON.stringify(
    [
        { field: "dish", matcher: "exact" },
        {
            field: "calories",
            matcher: "numeric_tolerance",
            tolerance: 0.25,
            relative: true,
        },
        { field: "items", matcher: "set_overlap" },
    ],
    null,
    2,
);

export const SIMPLE_SCHEMA = JSON.stringify(
    {
        type: "object",
        additionalProperties: false,
        required: ["answer"],
        properties: { answer: { type: "string" } },
    },
    null,
    2,
);

export const SIMPLE_RULES = JSON.stringify(
    [{ field: "answer", matcher: "exact" }],
    null,
    2,
);
