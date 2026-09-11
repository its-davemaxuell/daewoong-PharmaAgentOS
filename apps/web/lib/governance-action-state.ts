// Shared serializable form state is ordinary client/server code, not an action.
export type EvaluationActionState = { status: "idle" | "success" | "error"; message?: string };
export type ControlActionState = EvaluationActionState;
export const EMPTY_EVALUATION_ACTION_STATE: EvaluationActionState = { status: "idle" };
export const EMPTY_CONTROL_ACTION_STATE: ControlActionState = { status: "idle" };
