"use client";

import { MarkdownRenderer } from "../../components/ui/markdown-renderer";
import { motion } from "framer-motion";
import Beams from "@/components/Backgrounds/Beams/Beams";

export default function TestPage() {
  const simpleLatexTest = `# LaTeX Debug Test

## Basic Inline Math
Simple inline math: $x = 5$ and $y = 10$.

## Basic Display Math
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

## Simple Expression
$$E = mc^2$$

## Sum Example
$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

## Error Handling Tests
These should show raw LaTeX instead of disappearing:

### Malformed Inline Math
This has a missing closing brace: $\\frac{a}{b$ and should show raw text.

### Malformed Display Math
$$\\invalid{command}$$ - This should show as raw text with error styling.

### Incomplete Expression
This is incomplete: $x = \\sqrt{$ and should preserve the raw LaTeX.

### Unknown Command
$$\\unknown{x} + y$$ - This should handle the unknown command gracefully.

---

**Debug Information:**
- If you see LaTeX commands as plain text, KaTeX is not processing them
- If you see properly formatted math, KaTeX is working
- **NEW**: Malformed LaTeX should appear as yellow/amber raw text instead of disappearing
- Check the browser console for any KaTeX errors`;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 relative overflow-hidden">
      {/* Fixed Beams Background */}
      <motion.div
        className="fixed inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 3,
          delay: 0.5,
          ease: "easeInOut",
        }}
      >
        <Beams
          beamWidth={2}
          beamHeight={20}
          beamNumber={20}
          lightColor="#c4b5fd"
          speed={5}
          noiseIntensity={2}
          scale={0.15}
          rotation={20}
        />
      </motion.div>

      {/* Content */}
      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-3xl font-bold mb-6">LaTeX Debug Test</h1>
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 mb-6 border border-gray-700/50">
          <MarkdownRenderer content={simpleLatexTest} />
        </div>

        {/* Raw KaTeX test */}
        <div className="bg-gray-700/80 backdrop-blur-sm rounded-lg p-6 border border-gray-600/50">
          <h2 className="text-xl font-bold mb-4">Direct KaTeX Test</h2>
          <p className="mb-4">
            If this renders as an equation, KaTeX CSS is loaded:
          </p>
          <div
            className="katex-display"
            dangerouslySetInnerHTML={{
              __html: `<span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><semantics><mrow><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></mrow><annotation encoding="application/x-tex">E = mc^2</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.68333em;vertical-align:0em;"></span><span class="mord mathnormal" style="margin-right:0.05764em;">E</span><span class="mspace" style="margin-right:0.2777777777777778em;"></span><span class="mrel">=</span><span class="mspace" style="margin-right:0.2777777777777778em;"></span></span><span class="base"><span class="strut" style="height:0.8141079999999999em;vertical-align:0em;"></span><span class="mord mathnormal">m</span><span class="mord"><span class="mord mathnormal">c</span><span class="msupsub"><span class="vlist-t"><span class="vlist-r"><span class="vlist" style="height:0.8141079999999999em;"><span style="top:-3.063em;margin-right:0.05em;"><span class="pstrut" style="height:2.7em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight">2</span></span></span></span></span></span></span></span></span></span></span>`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
