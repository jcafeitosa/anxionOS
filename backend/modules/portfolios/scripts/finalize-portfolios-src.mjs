import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const write = (rel, c) => {
	fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
	fs.writeFileSync(path.join(root, rel), c);
};

// Hand-maintained files (see capital/strategies pattern)
write("src/application/errors.ts", read("src/application/errors.ts"));
write(
	"src/application/command-support.ts",
	read("src/application/command-support.ts"),
);
write(
	"src/domain/events/portfolios-events.ts",
	read("src/domain/events/portfolios-events.ts"),
);
write(
	"src/infrastructure/portfolios-unit-of-work.ts",
	read("src/infrastructure/portfolios-unit-of-work.ts"),
);
write("src/infrastructure/migrate.ts", read("src/infrastructure/migrate.ts"));
write(
	"src/application/consumers/fill-confirmed-consumer.ts",
	read("src/application/consumers/fill-confirmed-consumer.ts"),
);
write(
	"src/infrastructure/persistence/repositories.ts",
	read("src/infrastructure/persistence/repositories.ts"),
);

for (const rel of [
	"src/infrastructure/persistence/command-journal-repository.ts",
	"src/application/commands/create-portfolio.ts",
	"src/application/commands/apply-fill-to-position.ts",
]) {
	write(rel, read(rel));
}

console.log("finalized portfolios src");
