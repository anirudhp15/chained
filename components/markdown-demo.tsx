"use client";

import { MarkdownRenderer } from "./markdown-renderer";

const demoMarkdown = `# LaTeX Rendering Debug Test

## Exact Format from User's Screenshot

### Steps in the Derivation

1. **Model the Stock Price as a Stochastic Process:**

Described by a geometric Brownian motion: [ dS = \\mu S dt + \\sigma S dW ] where ( S ) is the stock price, ( \\mu ) is the drift rate, ( \\sigma ) is the volatility, and ( W ) is a Wiener process or Brownian motion.

2. **Formulate the Option Pricing Problem:**

If ( V(S, t) ) represents the option price as a function of the stock price ( S ) and time ( t ), the objective is to find a PDE for ( V ).

3. **Apply Ito's Lemma:**

To ( V(S, t) ), resulting in a stochastic differential equation.

### Additional Test Cases

Square bracket display math: [ E = mc^2 ]

Complex expression: [ \\frac{\\partial V}{\\partial t} + \\frac{1}{2}\\sigma^2 S^2 \\frac{\\partial^2 V}{\\partial S^2} = 0 ]

Inline parentheses: The drift term ( \\mu S dt ) and volatility ( \\sigma S dW ).

### Reference - Proper LaTeX

Display math: $$E = mc^2$$

Inline math: The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.

Complex display: $$\\frac{\\partial V}{\\partial t} + \\frac{1}{2}\\sigma^2 S^2 \\frac{\\partial^2 V}{\\partial S^2} = 0$$

---

If you can see the math expressions above rendered as beautiful equations (not raw text), then LaTeX is working! `;

export function MarkdownDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <div className="text-xs text-lavender-400 mb-4 flex items-center gap-2">
          <span>Markdown Rendering Demo</span>
          <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">
            Enhanced
          </span>
        </div>
        <MarkdownRenderer content={demoMarkdown} />
      </div>
    </div>
  );
}
