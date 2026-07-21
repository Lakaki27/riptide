export function requireEnv(name: string): string {
	const value = process.env[name];
	if (value === undefined) {
		throw new Error(`missing required env var: ${name}`);
	}
	return value;
}
