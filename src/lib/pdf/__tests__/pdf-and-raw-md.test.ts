import { describe, expect, it } from "bun:test";
import { compileMarkdownForPdf } from "../mdToPdfCompiler";
import { preprocessMarkdownMath, postprocessMathMarkdown, cleanLatexString } from "~/components/editor/MathExtension";

describe("PDF Export Compiler Fixes", () => {
  it("strips raw <mark> tags from headings and TOC", async () => {
    const input = "# <mark>Important Section</mark>\n\nSome text.";
    const { html, headings } = await compileMarkdownForPdf(input, { includeTableOfContents: true });

    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe("Important Section");
    expect(headings[0].text).not.toContain("<mark>");

    expect(html).toContain("Important Section");
    expect(html).toContain("pdf-highlight");
    expect(html).not.toContain("&lt;mark&gt;");
  });

  it("exports code blocks with syntax highlighting and avoids swallow by italics", async () => {
    const input = "*Notice this italic text* before code:\n\n```python\ndef solve(x):\n    return x * 2\n```\n\n*Notice this italic text* after code.";
    const { html } = await compileMarkdownForPdf(input);

    expect(html).toContain("pdf-code-container");
    expect(html).toContain("hljs-keyword");
    expect(html).toContain("solve");
  });

  it("handles Callout / Text boxes cleanly without nesting issues", async () => {
    const input = "> [!NOTE]\n> This is an important callout box with **bold text**.";
    const { html } = await compileMarkdownForPdf(input);

    expect(html).toContain("pdf-callout");
    expect(html).toContain("pdf-callout-note");
    expect(html).toContain("NOTE");
    expect(html).toContain("<strong>bold text</strong>");
  });

  it("detects wide ASCII diagrams, hides line numbers and scales font size", async () => {
    const asciiInput = "```plaintext\n+-----------------------------------+               +------------+\n|   Host A - IP 192.168.1.10        |               |   Host B   |\n+-----------------------------------+               +------------+\n```";
    const { html } = await compileMarkdownForPdf(asciiInput);

    expect(html).toContain("pdf-code-ascii");
    // Line numbers should be omitted for ASCII diagrams to save width
    expect(html).not.toContain("pdf-code-line-num");
    expect(html).toContain("Host A");
    expect(html).toContain("Host B");
  });
});

describe("Markdown View Math Pre/Post-processing", () => {
  it("preserves inline and block math through preprocessing and postprocessing", () => {
    const original = "Here is inline $\\sigma = 42$ and block:\n\n$$\n\\sum_{i=1}^n i = \\frac{n(n+1)}{2}\n$$\n\nDone.";
    const preprocessed = preprocessMarkdownMath(original);
    const postprocessed = postprocessMathMarkdown(preprocessed);

    expect(postprocessed).toContain("$\\sigma = 42$");
    expect(postprocessed).toContain("\\sum_{i=1}^n i = \\frac{n(n+1)}{2}");
  });

  it("safely escapes pipe characters in math attributes to protect markdown tables", () => {
    const tableWithPipes = "| Event | Probability |\n| --- | --- |\n| Conditional | $P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$ |";
    const preprocessed = preprocessMarkdownMath(tableWithPipes);
    // Attribute should contain &#124; instead of raw pipe so table cell doesn't split
    expect(preprocessed).toContain("&#124;");
    expect(preprocessed).not.toContain("data-latex=\"P(A|B)");

    const postprocessed = postprocessMathMarkdown(preprocessed);
    expect(postprocessed).toContain("$P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$");
  });

  it("rejects corrupted HTML tags and fragments from being parsed as math", () => {
    // These caused the < spandata - type = bug
    expect(cleanLatexString('<span data-type="math-inline"')).toBe("");
    expect(cleanLatexString('data-type="math-inline"')).toBe("");
    expect(cleanLatexString('< spandata - type =')).toBe("");
    expect(cleanLatexString('<div data-type="math-block"')).toBe("");
    expect(cleanLatexString('<span')).toBe("");

    // Valid LaTeX math remains intact
    expect(cleanLatexString("x < 5")).toBe("x < 5");
    expect(cleanLatexString("a > b")).toBe("a > b");
    expect(cleanLatexString("\\frac{a}{b}")).toBe("\\frac{a}{b}");
  });

  it("never converts naked equations without delimiters into math blocks", () => {
    const regularText = "The loss event reaction is:\nTCP Tahoe = cwnd reset to 1 MSS\nTCP Reno = cwnd reset to cwnd / 2\n";
    const preprocessed = preprocessMarkdownMath(regularText);
    expect(preprocessed).not.toContain("data-type=\"math-block\"");
    expect(preprocessed).toContain("TCP Tahoe = cwnd reset to 1 MSS");
  });

  it("isolates starting frontmatter without corrupting yaml code blocks", () => {
    const noteWithFrontmatter = "---\ntitle: My Document\nauthor: Parv\n---\n\n# Body content\n\n```yaml\napiVersion: v1\nkind: Pod\n```";
    const preprocessed = preprocessMarkdownMath(noteWithFrontmatter);
    expect(preprocessed).toContain("```yaml frontmatter");
    expect(preprocessed).toContain("```yaml\napiVersion: v1");

    const postprocessed = postprocessMathMarkdown(preprocessed);
    expect(postprocessed).toContain("---\ntitle: My Document\nauthor: Parv\n---");
    // Normal YAML code block in body must stay a code block, never mutated into frontmatter
    expect(postprocessed).toContain("```yaml\napiVersion: v1\nkind: Pod\n```");
  });
});

