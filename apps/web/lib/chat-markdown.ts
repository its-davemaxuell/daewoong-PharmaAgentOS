/** Split GFM table cells without breaking escaped pipes or inline code. */
export function tableCells(line: string): string[] {
  const source = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  const cells: string[] = [];
  let cell = "";
  let inCode = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "\\" && source[index + 1] === "|") { cell += "|"; index += 1; }
    else if (character === "`") { inCode = !inCode; cell += character; }
    else if (character === "|" && !inCode) { cells.push(cell.trim()); cell = ""; }
    else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

export function isTableDivider(line: string, columns: number) {
  const cells = tableCells(line);
  return columns > 1 && cells.length === columns && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}
