import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Users,
  Brain,
  Play,
  Star,
  GitBranch,
  Layers,
  Link2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <Link2 className="h-6 w-6 text-lavender-400" />
            </Link>
            <span className="text-xl font-bold text-white">Chained.Chat</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="#demo"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Demo
            </Link>
            <Link
              href="#pricing"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#docs"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Docs
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/signin"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/chat"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all"
            >
              Try for Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Chain{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  AI Models
                </span>
                <br />
                Together For Powerful Results
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl">
                Create sophisticated AI workflows by chaining multiple models to
                run sequentially, conditionally, or in parallel for more
                comprehensive and specialized outputs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all group"
                >
                  Start Building
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="inline-flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all border border-gray-600">
                  Watch Demo
                </button>
              </div>
            </div>

            {/* Chain Visualization */}
            <div className="relative">
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
                <div className="flex flex-col space-y-6">
                  {/* Input Node */}
                  <div className="flex items-center justify-center">
                    <div className="bg-blue-600/20 border border-blue-500/50 rounded-full px-6 py-3 text-blue-300 font-medium">
                      Input
                    </div>
                  </div>

                  {/* Connecting Lines and Model Nodes */}
                  <div className="flex items-center justify-center">
                    <div className="w-px h-8 bg-gradient-to-b from-blue-500 to-purple-500"></div>
                  </div>

                  <div className="flex items-center justify-between space-x-4">
                    <div className="bg-gray-700/50 border border-gray-600 rounded-full px-4 py-2 text-gray-300 text-sm">
                      Model 1
                    </div>
                    <div className="w-8 h-px bg-gradient-to-r from-purple-500 to-blue-500"></div>
                    <div className="bg-gray-700/50 border border-gray-600 rounded-full px-4 py-2 text-gray-300 text-sm">
                      Model 2
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-px h-8 bg-gradient-to-b from-purple-500 to-blue-500"></div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="bg-gray-700/50 border border-gray-600 rounded-full px-4 py-2 text-gray-300 text-sm">
                      Model 3
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-px h-8 bg-gradient-to-b from-blue-500 to-green-500"></div>
                  </div>

                  {/* Output Node */}
                  <div className="flex items-center justify-center">
                    <div className="bg-green-600/20 border border-green-500/50 rounded-full px-6 py-3 text-green-300 font-medium">
                      Output
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* How It Works Section */}
      <section className="relative z-10 px-6 py-20 bg-gray-900/20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            How It Works
          </h2>
          <p className="text-lg text-gray-300 mb-16 max-w-3xl mx-auto">
            Chain multiple AI models together to create powerful workflows that
            leverage the strengths of each model.
          </p>

          {/* Video Placeholder */}
          <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden max-w-4xl mx-auto">
            <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="text-center">
                <div className="bg-gray-700/50 rounded-full p-4 mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  See Chained.Chats in Action
                </h3>
                <p className="text-gray-400">
                  Watch how to create and run model chains in minutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-6">
            Powerful Features
          </h2>
          <p className="text-lg text-gray-300 text-center mb-16 max-w-3xl mx-auto">
            Everything you need to build sophisticated AI workflows
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
              <div className="bg-purple-600/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <GitBranch className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Sequential Chains
              </h3>
              <p className="text-gray-300">
                Pass outputs from one model to another, creating a pipeline of
                AI processing for comprehensive results.
              </p>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
              <div className="bg-blue-600/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Conditional Logic
              </h3>
              <p className="text-gray-300">
                Create branches in your AI workflows based on the content or
                classification of previous model outputs.
              </p>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
              <div className="bg-pink-600/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Layers className="h-6 w-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Parallel Processing
              </h3>
              <p className="text-gray-300">
                Run multiple models simultaneously on the same input and combine
                their outputs for enhanced results.
              </p>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
              <div className="bg-yellow-600/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Model Diversity
              </h3>
              <p className="text-gray-300">
                Access a wide range of foundation models including GPT-4,
                Claude, Gemini, and more in a single workflow.
              </p>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
              <div className="bg-green-600/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Custom Agents
              </h3>
              <p className="text-gray-300">
                Create specialized agents with specific roles and expertise to
                handle different parts of your workflow.
              </p>
            </div>

            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
              <div className="bg-blue-600/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Brain className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Workflow Templates
              </h3>
              <p className="text-gray-300">
                Start with pre-built templates for common use cases and
                customize them to your needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* See It In Action Section */}
      <section id="demo" className="relative z-10 px-6 py-20 bg-gray-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                See It In Action
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Watch how Chained.Chats can transform your AI workflows with
                powerful model chaining capabilities.
              </p>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-600/20 w-8 h-8 rounded-lg flex items-center justify-center mt-1">
                    <GitBranch className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Build Complex Chains
                    </h3>
                    <p className="text-gray-300">
                      Create sophisticated workflows with multiple models
                      working together.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600/20 w-8 h-8 rounded-lg flex items-center justify-center mt-1">
                    <Zap className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Conditional Branching
                    </h3>
                    <p className="text-gray-300">
                      Direct your workflow based on the content of previous
                      model outputs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-pink-600/20 w-8 h-8 rounded-lg flex items-center justify-center mt-1">
                    <Brain className="h-4 w-4 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Model Specialization
                    </h3>
                    <p className="text-gray-300">
                      Use the right model for each specific task in your
                      workflow.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Placeholder */}
            <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden">
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center">
                  <div className="bg-gray-700/50 rounded-full p-4 mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Advanced Chaining Demo
                  </h3>
                  <p className="text-gray-400">
                    See how to build complex AI workflows
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Choose Your Models Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Choose Your Models
          </h2>
          <p className="text-lg text-gray-300 mb-16 max-w-3xl mx-auto">
            Mix and match from a wide range of foundation models to create the
            perfect workflow
          </p>

          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">
                Build Your Chain
              </h3>
              <p className="text-gray-400">
                Select models to include in your workflow
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-4 text-center">
                <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                  G
                </div>
                <h4 className="text-white font-medium mb-1">GPT-4o</h4>
                <p className="text-green-400 text-sm">OpenAI</p>
              </div>

              <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg p-4 text-center">
                <div className="w-8 h-8 bg-yellow-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                  C
                </div>
                <h4 className="text-white font-medium mb-1">Claude 3 Opus</h4>
                <p className="text-yellow-400 text-sm">Anthropic</p>
              </div>

              <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg p-4 text-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                  G
                </div>
                <h4 className="text-white font-medium mb-1">Gemini Pro</h4>
                <p className="text-blue-400 text-sm">Google</p>
              </div>

              <div className="bg-gray-600/20 border border-gray-500/50 rounded-lg p-4 text-center">
                <div className="w-8 h-8 bg-gray-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                  L
                </div>
                <h4 className="text-white font-medium mb-1">Llama 3</h4>
                <p className="text-gray-400 text-sm">Meta</p>
              </div>

              <div className="bg-purple-600/20 border border-purple-500/50 rounded-lg p-4 text-center">
                <div className="w-8 h-8 bg-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                  M
                </div>
                <h4 className="text-white font-medium mb-1">Mistral Large</h4>
                <p className="text-purple-400 text-sm">Mistral AI</p>
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                <ArrowRight className="h-4 w-4" />
                <span>Chain Preview</span>
              </div>
              <p className="text-gray-300">
                Your selected models will process inputs in sequence, with each
                model building on the previous output.
              </p>
            </div>

            <Link
              href="/chat"
              className="inline-flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-all"
            >
              Create Chain
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 px-6 py-20 bg-gray-900/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Build Your First Chain?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Start creating powerful AI workflows in minutes. No setup required.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all group"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 bg-gray-900/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <span className="text-lg font-bold text-white">
                  Chained.Chats
                </span>
              </div>
              <p className="text-gray-400 mb-4">
                Create powerful AI workflows by chaining multiple models
                together.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="#features"
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="hover:text-white transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#api"
                    className="hover:text-white transition-colors"
                  >
                    API
                  </Link>
                </li>
                <li>
                  <Link
                    href="#integrations"
                    className="hover:text-white transition-colors"
                  >
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="#docs"
                    className="hover:text-white transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="#tutorials"
                    className="hover:text-white transition-colors"
                  >
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link
                    href="#blog"
                    className="hover:text-white transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="#community"
                    className="hover:text-white transition-colors"
                  >
                    Community
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="#about"
                    className="hover:text-white transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="#careers"
                    className="hover:text-white transition-colors"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href="#contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="#legal"
                    className="hover:text-white transition-colors"
                  >
                    Legal
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 Chained.Chats. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                href="#privacy"
                className="text-gray-400 text-sm hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#terms"
                className="text-gray-400 text-sm hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#cookies"
                className="text-gray-400 text-sm hover:text-white transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
