#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(moduleRoot, "dist");
const srcRoot = path.join(moduleRoot, "src");

function walk(dir, cb) {
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, ent.name);
		if (ent.isDirectory()) walk(full, cb);
		else cb(full);
	}
}

function stripMap(content) {
	return content.replace(/^\/\/# sourceMappingURL=.*$/m, "").trimEnd();
}

function isReexportOnly(js) {
	const trimmed = stripMap(js).trim();
	return /^export\s*\{[\s\S]*\}\s*from\s*["'][^"']+["'];?\s*$/.test(trimmed);
}

function parseDeclareFunctions(dts) {
	const regex = /export declare (async )?function (\w+)\(([\s\S]*?)\)(:\s*[\s\S]*?)?;/g;
	const out = [];
	let match;
	while ((match = regex.exec(dts)) !== null) {
		out.push({
			async: Boolean(match[1]),
			name: match[2],
			params: match[3].trim().replace(/,\s*$/, ""),
			returnType: match[4] ?? "",
		});
	}
	return out;
}

function typeOnlySection(dts) {
	return dts
		.replace(/export declare (async )?function [\s\S]*?;/g, "")
		.replace(/export declare class [\s\S]*?\n\}/g, "")
		.replace(/\bdeclare /g, "")
		.replace(/^\/\/# sourceMappingURL=.*$/m, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function applyFunctionSignatures(js, signatures) {
	let result = js;
	for (const sig of signatures) {
		const asyncPart = sig.async ? "async " : "";
		const typedHead = `export ${asyncPart}function ${sig.name}(${sig.params})${sig.returnType} {`;
		const pattern = new RegExp(`export ${asyncPart}function ${sig.name}\\([^)]*\\)\\s*\\{`);
		if (!pattern.test(result)) {
			const multiline = new RegExp(`export ${asyncPart}function ${sig.name}\\([\\s\\S]*?\\)\\s*\\{`);
			result = result.replace(multiline, typedHead);
		} else {
			result = result.replace(pattern, typedHead);
		}
	}
	return result;
}

function applyClassSignatures(js, rawDts) {
	const regex = /export declare class (\w+)([\s\S]*?\n\})/g;
	let result = js;
	let match;
	while ((match = regex.exec(rawDts)) !== null) {
		const name = match[1];
		const classDecl = match[0].replace("declare ", "");
		const jsClassRegex = new RegExp(`export class ${name}[\\s\\S]*$`);
		const jsClass = result.match(jsClassRegex);
		if (jsClass) {
			const bodyStart = jsClass[0].indexOf("{");
			const body = jsClass[0].slice(bodyStart);
			const header = classDecl.replace(/\{[\s\S]*$/, "").trim();
			result = result.replace(jsClassRegex, `${header} ${body}`);
		}
	}
	return result;
}

function mergeImplFile(dtsPath, jsPath) {
	const rawDts = fs.readFileSync(dtsPath, "utf8");
	const js = stripMap(fs.readFileSync(jsPath, "utf8"));
	if (isReexportOnly(js)) return `${typeOnlySection(rawDts)}\n\n${js.trim()}\n`;
	const signatures = parseDeclareFunctions(rawDts);
	let typedJs = applyFunctionSignatures(js, signatures);
	typedJs = applyClassSignatures(typedJs, rawDts);
	const header = typeOnlySection(rawDts);
	const headerImports = header.split("\n").filter((l) => l.startsWith("import ")).join("\n");
	const headerTypes = header.split("\n").filter((l) => !l.startsWith("import ")).join("\n").trim();
	const jsImports = typedJs.split("\n").filter((l) => l.startsWith("import ")).join("\n");
	const jsBody = typedJs.split("\n").filter((l) => !l.startsWith("import ")).join("\n").trim();
	const imports = [...new Set([...headerImports.split("\n"), ...jsImports.split("\n")])].filter(Boolean).join("\n");
	return `${[imports, headerTypes, jsBody].filter(Boolean).join("\n\n")}\n`;
}

function splitContractImports(specifiers) {
	const events = [];
	const accounting = [];
	for (const name of specifiers.split(",").map((s) => s.trim()).filter(Boolean)) {
		const bare = name.replace(/^type\s+/, "").trim();
		if (bare === "DomainEventEnvelope" || bare === "domainEventEnvelopeSchema") {
			events.push(name);
		} else if (bare === "schemaVersion") {
			continue;
		} else {
			accounting.push(name);
		}
	}
	return { events, accounting };
}

function fixImports(content) {
	let out = content.replace(/import type \{([^}]*)\} from "@anxionos\/contracts";/g, (_m, specifiers) => {
		const { events, accounting } = splitContractImports(specifiers);
		const parts = [];
		if (events.length) parts.push(`import type { ${events.join(", ")} } from "@anxionos/contracts/events";`);
		if (accounting.length) parts.push(`import type { ${accounting.join(", ")} } from "@anxionos/contracts/accounting";`);
		return parts.join("\n");
	});
	out = out.replace(/import\s*\{([^}]*)\}\s*from\s*"@anxionos\/contracts";/g, (_match, specifiers) => {
		const { events, accounting } = splitContractImports(specifiers);
		const parts = [];
		if (events.length) parts.push(`import { ${events.join(", ")} } from "@anxionos/contracts/events";`);
		if (accounting.length) parts.push(`import { ${accounting.join(", ")} } from "@anxionos/contracts/accounting";`);
		return parts.join("\n");
	});
	return out.replace(/from "@anxionos\/eventing"/g, 'from "@anxionos/eventing/postgres"');
}

function reconstruct() {
	if (fs.existsSync(srcRoot)) fs.rmSync(srcRoot, { recursive: true, force: true });
	fs.mkdirSync(srcRoot, { recursive: true });
	let count = 0;
	walk(distRoot, (file) => {
		if (!file.endsWith(".d.ts")) return;
		const rel = path.relative(distRoot, file);
		const jsPath = path.join(distRoot, rel.replace(/\.d\.ts$/, ".js"));
		const tsPath = path.join(srcRoot, rel.replace(/\.d\.ts$/, ".ts"));
		fs.mkdirSync(path.dirname(tsPath), { recursive: true });
		const rawDts = fs.readFileSync(file, "utf8");
		const hasImpl = rawDts.includes("declare function") || rawDts.includes("declare class");
		let content;
		if (!hasImpl || !fs.existsSync(jsPath)) content = `${typeOnlySection(rawDts)}\n`;
		else content = mergeImplFile(file, jsPath);
		fs.writeFileSync(tsPath, fixImports(content));
		count++;
	});
	console.log(`Reconstructed ${count} TypeScript files in src/`);
}

reconstruct();
