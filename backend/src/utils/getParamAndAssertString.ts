export function getParamAndAssertString(
    params: Record<string, string | string[] | undefined>,
    name: string,
): string | undefined {
    const value = params[name];
    return typeof value === "string" ? value : undefined;
}
