"use client";

import { MarkdownRenderer } from "../../components/markdown-renderer";

export default function TestMathPage() {
  const testContent = `# MathJax Test Page

## Simple Math Test

Inline math: $E = mc^2$

Display math:
$$F = ma$$

## Complex Math Test

Square root: $\\sqrt{x^2 + y^2}$

Fraction: $\\frac{a}{b}$

Display equation:
$$\\frac{\\partial V}{\\partial t} + \\frac{1}{2}\\sigma^2 S^2 \\frac{\\partial^2 V}{\\partial S^2} = 0$$

## Original Format (Square Brackets)

This should be converted: [ dS = \\mu S dt + \\sigma S dW ]

And this: [ \\int_0^\\infty e^{-x} dx = 1 ]

## Greek Letters and Symbols

$\\alpha, \\beta, \\gamma, \\Delta, \\Sigma, \\Omega$

$$\\sum_{i=1}^{n} x_i = \\mu$$

## Matrix Test

$$\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}$$
`;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          MathJax Test Page
        </h1>
        <div className="bg-gray-800 rounded-lg p-6">
          <MarkdownRenderer content={testContent} />
        </div>
      </div>
    </div>
  );
}
