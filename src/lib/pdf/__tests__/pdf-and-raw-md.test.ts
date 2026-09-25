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

describe("PDF Engine Typography & Pagination Invariants", () => {
  it("enforces text-align: left on paragraphs in academic preset to avoid word gaps", async () => {
    const { buildPdfStylesheet } = await import("../pdfEngine");
    const stylesheet = buildPdfStylesheet({
      fileName: "Test.pdf",
      themePreset: "academic",
    });

    expect(stylesheet).toContain(".pdf-paragraph");
    expect(stylesheet).toContain("text-align: left !important;");
    expect(stylesheet).not.toContain("text-align: justify");
  });

  it("enforces break-inside: avoid on table rows and table-header-group on thead", async () => {
    const { buildPdfStylesheet } = await import("../pdfEngine");
    const stylesheet = buildPdfStylesheet({ fileName: "Test.pdf" });

    expect(stylesheet).toContain(".pdf-table thead");
    expect(stylesheet).toContain("display: table-header-group !important;");
    expect(stylesheet).toContain(".pdf-table tr");
    expect(stylesheet).toContain("page-break-inside: avoid !important;");
  });

  it("compiles paragraphs with natural soft newlines as spaces rather than forced br tags", async () => {
    const input = "An integer ranging from 0 to 65,535 that uniquely identifies a specific application\nprocess running inside a host operating system.";
    const { html } = await compileMarkdownForPdf(input);

    expect(html).toContain("An integer ranging from 0 to 65,535 that uniquely identifies a specific application process running inside a host operating system.");
    expect(html).not.toContain("<br/>");
  });

  it("preserves explicit markdown hard line breaks (two trailing spaces)", async () => {
    const input = "Line 1 with hard break  \nLine 2 continued.";
    const { html } = await compileMarkdownForPdf(input);

    expect(html).toContain("Line 1 with hard break<br/>Line 2 continued.");
  });
});

describe("Editor Markdown Paste Invariants", () => {
  it("preserves multi-line code blocks with multiple imports and blank lines without prematurely ending", async () => {
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM("");
    (global as any).window = dom.window;
    (global as any).document = dom.window.document;
    (global as any).DOMParser = dom.window.DOMParser;
    (global as any).Node = dom.window.Node;
    (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);

    const { Editor } = await import("@tiptap/core");
    const { buildExtensions } = await import("~/components/editor/extensions");
    const { DOMParser: ProseMirrorDOMParser } = await import("@tiptap/pm/model");

    const editor = new Editor({
      extensions: buildExtensions(),
    });

    const markdownWithImports = `Here is the server code:

\`\`\`java
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;

public class Server {
    public static void main(String[] args) {
        System.out.println("Hello Server");
    }
}
\`\`\`

End of note.`;

    const markdownParser = (editor.storage as any).markdown?.parser;
    const parsedDoc = markdownParser.parse(markdownWithImports);
    const domBody = new (global as any).DOMParser().parseFromString(`<body>${parsedDoc}</body>`, "text/html").body;
    const pmSlice = ProseMirrorDOMParser.fromSchema(editor.schema).parseSlice(domBody, { preserveWhitespace: true });

    editor.commands.setContent("<p></p>");
    editor.commands.insertContent(pmSlice.content);

    const json = editor.getJSON();
    const codeBlockNode = json.content?.find((node) => node.type === "codeBlock");

    expect(codeBlockNode).toBeDefined();
    expect(codeBlockNode?.attrs?.language).toBe("java");
    expect(codeBlockNode?.content?.[0]?.text).toContain("import java.io.BufferedReader;");
    expect(codeBlockNode?.content?.[0]?.text).toContain("import java.net.Socket;");
    expect(codeBlockNode?.content?.[0]?.text).toContain("public class Server {");
    expect(codeBlockNode?.content?.[0]?.text).toContain('System.out.println("Hello Server");');

    // Ensure it was NOT split into a paragraph with code mark
    const splitParagraphWithCode = json.content?.find(
      (node) => node.type === "paragraph" && node.content?.some((c) => c.marks?.some((m) => m.type === "code"))
    );
    expect(splitParagraphWithCode).toBeUndefined();
  });
});

